import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { connectDB } from './lib/db';
import { Scan } from './lib/models/scan';
import { Violation } from './lib/models/violation';
import { runScan } from './lib/scanner/index';
import { generateScanSummary, generateBatchRemediations } from './lib/featherless';

const POLL_INTERVAL = 3000; // 3 seconds
const CONCURRENCY_LIMIT = 2; // Max 2 concurrent scans

let activeScans = 0;
let isAiProcessing = false;

async function processAiSynthesis() {
  if (isAiProcessing) return;
  isAiProcessing = true;
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
        // Small delay after summary
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        console.error(`❌ [AI Catch-up] Summary failed for ${scanToSummarize._id}:`, err instanceof Error ? err.message : String(err));
      }
    }

    // 2. Find PENDING violations across any completed scans (Batch up to 10)
    const violationsToRemediate = await Violation.find({
      'aiRemediation.status': 'PENDING'
    }).limit(10);

    if (violationsToRemediate.length > 0) {
      console.log(`🛠️ [AI Catch-up] Remediating ${violationsToRemediate.length} violations in batch...`);
      try {
        const inputs = violationsToRemediate.map(v => ({
          id: v._id.toString(),
          ruleId: v.ruleId,
          failureSummary: v.failureSummary || v.description || '',
          htmlSnippet: v.htmlSnippet || '',
          description: v.description || ''
        }));
        
        const results = await generateBatchRemediations(inputs);
        
        for (const result of results) {
          await Violation.findByIdAndUpdate(result.id, {
            aiRemediation: {
              analysis: result.analysis,
              remediatedCode: result.remediatedCode,
              explanation: result.explanation,
              status: 'GENERATED',
            }
          });
        }
        
        // Handle failed items (if model forgot to return them)
        const successIds = results.map(r => r.id);
        const failedIds = inputs.filter(i => !successIds.includes(i.id)).map(i => i.id);
        
        if (failedIds.length > 0) {
           await Violation.updateMany({ _id: { $in: failedIds } }, { 'aiRemediation.status': 'FAILED' });
           console.warn(`⚠️ [AI Catch-up] ${failedIds.length} violations failed to remediate in batch.`);
        }
        
        console.log(`✅ [AI Catch-up] Remediated ${successIds.length} violations successfully.`);
        // Sleep 5 seconds to let API concurrency tokens reset fully
        await new Promise(r => setTimeout(r, 5000));
      } catch (err) {
        console.warn(`⚠️ [AI Catch-up] Batch remediation failed:`, err instanceof Error ? err.message : String(err));
        
        const badRequest = String(err).includes('400') || String(err).includes('Failed to parse');
        if (badRequest) {
          const ids = violationsToRemediate.map(v => v._id);
          await Violation.updateMany({ _id: { $in: ids } }, { 'aiRemediation.status': 'FAILED' });
        }
      }
    }
  } catch (err) {
    console.error('Error in AI synthesis catch-up:', err);
  } finally {
    isAiProcessing = false;
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
