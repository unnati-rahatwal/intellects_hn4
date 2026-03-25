import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import mongoose from 'mongoose';
import { runScan } from './lib/scanner/index';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/a11y-audit';

async function main() {
  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ MongoDB connected');

  const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  console.log('✅ Redis connected');

  const worker = new Worker(
    'accessibility-audits',
    async (job) => {
      console.log(`\n🔍 Processing scan job: ${job.id}`);
      console.log(`   Scan ID: ${job.data.scanId}`);
      console.log(`   URLs: ${job.data.urls.join(', ')}`);

      try {
        await runScan(job.data.scanId, job.data.urls, job.data.options);
        console.log(`✅ Scan ${job.data.scanId} completed successfully`);
      } catch (error) {
        console.error(`❌ Scan ${job.data.scanId} failed:`, error);
        throw error;
      }
    },
    {
      connection,
      concurrency: 2, // Max 2 simultaneous Playwright instances
      limiter: {
        max: 5,
        duration: 60000, // Max 5 scans per minute
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ Job ${job?.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err);
  });

  console.log('🚀 Worker started. Listening for accessibility audit jobs...\n');

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down worker...');
    await worker.close();
    await connection.quit();
    await mongoose.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await worker.close();
    await connection.quit();
    await mongoose.disconnect();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Worker startup failed:', err);
  process.exit(1);
});
