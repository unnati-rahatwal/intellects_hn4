import { Queue, QueueOptions } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return connection;
}

const queueOptions: QueueOptions = {
  connection: {
    host: new URL(REDIS_URL).hostname || 'localhost',
    port: parseInt(new URL(REDIS_URL).port || '6379'),
  },
};

export interface ScanJobData {
  scanId: string;
  projectId: string;
  urls: string[];
  options: {
    discoverRoutes: boolean;
    maxDepth: number;
    includeShadowDom: boolean;
    includeIframes: boolean;
    visionEmulation: boolean;
    securityAudit: boolean;
  };
}

let scanQueue: Queue<ScanJobData> | null = null;

export function getScanQueue(): Queue<ScanJobData> {
  if (!scanQueue) {
    scanQueue = new Queue<ScanJobData>('accessibility-audits', queueOptions);
  }
  return scanQueue;
}
