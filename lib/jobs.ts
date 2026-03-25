import { Scan, IScan } from './models/scan';

/**
 * Enqueue a scan job by creating a PENDING scan document.
 * The worker process will poll for these and pick them up.
 */
export async function enqueueScan(
  projectId: string, 
  urls: string[], 
  options: IScan['options']
): Promise<IScan> {
  const scan = new Scan({
    projectId,
    targetUrls: urls,
    options,
    status: 'PENDING',
  });
  await scan.save();
  return scan;
}

/**
 * Atomically pick up a pending job and mark it as processing.
 */
export async function pickUpJob(): Promise<IScan | null> {
  return await Scan.findOneAndUpdate(
    { status: 'PENDING' },
    { 
      $set: { 
        status: 'PROCESSING',
        startedAt: new Date()
      } 
    },
    { sort: { createdAt: 1 }, new: true }
  );
}
