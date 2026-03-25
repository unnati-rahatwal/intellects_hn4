import { generateScanSummary } from './lib/featherless';
import dotenv from 'dotenv';
dotenv.config();

const stats = {
  score: 50,
  violations: { critical: 1, serious: 2, moderate: 3, minor: 4, total: 10 },
  performance: { avgLoadTime: 1000, avgFcp: 2000, avgTaskDuration: 3000 }
};

async function test() {
  try {
    const res = await generateScanSummary(stats);
    console.log('SUCCESS:', JSON.stringify(res, null, 2));
  } catch (err: any) {
    console.log('ERROR MESSAGE:', err.message);
  }
}
test();
