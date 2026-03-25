import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { connectDB } from './lib/db';
import { Scan } from './lib/models/scan';
import { Violation } from './lib/models/violation';
import { runScan } from './lib/scanner/index';
import { generateScanSummary, generateRemediation } from './lib/featherless';

const POLL_INTERVAL = 3000; // 3 seconds
const CONCURRENCY_LIMIT = 2; // Max 2 concurrent scans

let activeScans = 0;

async function processAiSynthesis() {
  try {
    // 1. Find COMPLETED scans missing AI summary
    const scanToSummarize = await Scan.findOne({
      status: 'COMPLETED',
      'aiSummary.generatedAt': null
    });

    if (scanToSummarize) {
      console.log(`🧠 [AI Catch-up] Generating Executive Summary for ${scanToSummarize._id}...`);
      const stats = {
        score: scanToSummarize.accessibilityScore,
        violations: {
          critical: scanToSummarize.criticalIssues,
          serious: scanToSummarize.seriousIssues,
          moderate: scanToSummarize.moderateIssues,
          minor: scanToSummarize.minorIssues,
          total: scanToSummarize.totalViolations
        },
        performance: scanToSummarize.performanceSummary
      };

      try {
        const summary = await generateScanSummary(stats);
        await Scan.findByIdAndUpdate(scanToSummarize._id, {
          aiSummary: {
            ...summary,
            generatedAt: new Date()
          }
        });
        console.log(`✅ [AI Catch-up] Summary generated for ${scanToSummarize._id}`);
      } catch (err) {
        console.error(`❌ [AI Catch-up] Summary failed for ${scanToSummarize._id}:`, err instanceof Error ? err.message : String(err));
      }
    }

    // 2. Find PENDING violations across any completed scans
    const violationToRemediate = await Violation.findOne({
      'aiRemediation.status': 'PENDING'
    });

    if (violationToRemediate) {
      console.log(`🛠️ [AI Catch-up] Remediating violation ${violationToRemediate._id} (${violationToRemediate.ruleId})...`);
      try {
        const result = await generateRemediation(
          violationToRemediate.ruleId,
          violationToRemediate.failureSummary,
          violationToRemediate.htmlSnippet,
          violationToRemediate.description
        );
        await Violation.findByIdAndUpdate(violationToRemediate._id, {
          aiRemediation: {
            analysis: result.analysis,
            remediatedCode: result.remediatedCode,
            explanation: result.explanation,
            status: 'GENERATED',
          }
        });
        console.log(`✅ [AI Catch-up] Remediated ${violationToRemediate._id}`);
      } catch (err) {
        console.warn(`⚠️ [AI Catch-up] Remediation failed for ${violationToRemediate._id}:`, err instanceof Error ? err.message : String(err));
        // Set to FAILED if it contains "API error 4xx" to avoid infinite loops on bad requests
        if (String(err).includes('400')) {
          await Violation.findByIdAndUpdate(violationToRemediate._id, { 'aiRemediation.status': 'FAILED' });
        }
      }
    }
  } catch (err) {
    console.error('Error in AI synthesis catch-up:', err);
  }
}

async function pollJobs() {
  if (activeScans >= CONCURRENCY_LIMIT) return;

  try {
    // Also process AI synthesis every poll cycle
    processAiSynthesis();

    const job = await Scan.findOneAndUpdate(
      { status: 'PENDING' },
      { $set: { status: 'PROCESSING', startedAt: new Date() } },
      { sort: { createdAt: 1 }, returnDocument: 'after' }
    );

    if (job) {
      activeScans++;
      console.log(`\n🔍 Found PENDING scan: ${job._id}`);
      runScan(job._id.toString(), job.targetUrls, job.options)
        .then(() => {
          console.log(`✅ Scan ${job._id} completed. AI synthesis will follow in next poll cycle.`);
        })
        .catch((error) => {
          console.error(`❌ Scan ${job._id} failed:`, error);
        })
        .finally(() => {
          activeScans--;
        });
    }
  } catch (err) {
    console.error('Error polling jobs:', err);
  }
}

async function main() {
  console.log('🔄 Connecting to MongoDB...');
  const maskedUri = (process.env.MONGODB_URI || '').replace(/:([^@]+)@/, ':****@');
  console.log(`📡 URI: ${maskedUri || 'NOT FOUND - using local default'}`);
  await connectDB();
  console.log('✅ MongoDB connected');

  console.log(`🚀 Worker started. Polling for accessibility audit jobs every ${POLL_INTERVAL / 1000}s...`);
  console.log(`📡 Concurrency limit: ${CONCURRENCY_LIMIT} active scans\n`);

  // Polling loop
  setInterval(pollJobs, POLL_INTERVAL);

  // Initial poll
  pollJobs();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down worker...');
    await mongoose.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Worker startup failed:', err);
  process.exit(1);
});
