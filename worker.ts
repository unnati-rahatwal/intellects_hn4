import mongoose from 'mongoose';
import { connectDB } from './lib/db';
import { Scan } from './lib/models/scan';
import { runScan } from './lib/scanner/index';

const POLL_INTERVAL = 3000; // 3 seconds
const CONCURRENCY_LIMIT = 2; // Max 2 concurrent scans

let activeScans = 0;

async function pollJobs() {
  if (activeScans >= CONCURRENCY_LIMIT) {
    return;
  }

  try {
    // Atomically pick up a PENDING job
    const job = await Scan.findOneAndUpdate(
      { status: 'PENDING' },
      { 
        $set: { 
          status: 'PROCESSING',
          startedAt: new Date()
        } 
      },
      { sort: { createdAt: 1 }, new: true }
    );

    if (job) {
      activeScans++;
      console.log(`\n🔍 Found PENDING scan: ${job._id}`);
      console.log(`   URLs: ${job.targetUrls.join(', ')}`);

      // Run scan in background (not awaiting, to allow next polling cycle)
      runScan(job._id.toString(), job.targetUrls, job.options)
        .then(() => {
          console.log(`✅ Scan ${job._id} completed successfully`);
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
  await connectDB();
  console.log('✅ MongoDB connected');

  console.log(`🚀 Worker started. Polling for accessibility audit jobs every ${POLL_INTERVAL/1000}s...`);
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
