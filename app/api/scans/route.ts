import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Scan } from '@/lib/models/scan';
import { Project } from '@/lib/models/project';
import { getScanQueue } from '@/lib/queue';

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();

    const { projectId, urls, options } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const targetUrls = urls && urls.length > 0 ? urls : [project.baseUrl];

    const scanOptions = {
      discoverRoutes: options?.discoverRoutes ?? true,
      maxDepth: options?.maxDepth ?? 3,
      includeShadowDom: options?.includeShadowDom ?? true,
      includeIframes: options?.includeIframes ?? true,
      visionEmulation: options?.visionEmulation ?? false,
      securityAudit: options?.securityAudit ?? true,
    };

    const scan = await Scan.create({
      projectId,
      status: 'PENDING',
      targetUrls,
      options: scanOptions,
    });

    // Push to BullMQ queue
    try {
      const queue = getScanQueue();
      await queue.add('scan', {
        scanId: scan._id.toString(),
        projectId,
        urls: targetUrls,
        options: scanOptions,
      });
    } catch (queueError) {
      console.warn('Queue unavailable, will need manual processing:', queueError);
      // Scan is still created with PENDING status
    }

    return NextResponse.json(scan, { status: 201 });
  } catch (error) {
    console.error('POST /api/scans error:', error);
    return NextResponse.json({ error: 'Failed to create scan' }, { status: 500 });
  }
}
