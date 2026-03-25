import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Scan } from '@/lib/models/scan';
import { Project } from '@/lib/models/project';

export async function POST(req: Request) {
  try {
    await connectDB();
    const { projectId, urls, options } = await req.json();

    if (!projectId || !urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Create a new scan document with PENDING status
    // The background worker will poll for this and start the scan
    const scan = new Scan({
      projectId,
      targetUrls: urls,
      options: {
        discoverRoutes: options?.discoverRoutes ?? true,
        maxDepth: options?.maxDepth ?? 3,
        includeShadowDom: options?.includeShadowDom ?? true,
        includeIframes: options?.includeIframes ?? true,
        visionEmulation: options?.visionEmulation ?? false,
        securityAudit: options?.securityAudit ?? true,
      },
      status: 'PENDING',
    });

    await scan.save();

    return NextResponse.json({ 
      message: 'Scan queued successfully', 
      scanId: scan._id,
      status: scan.status 
    }, { status: 201 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Failed to start scan:', err);
    return NextResponse.json({ error: 'Failed to queue scan', details: errorMessage }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    const filter = projectId ? { projectId } : {};
    const scans = await Scan.find(filter).sort({ createdAt: -1 }).limit(20);

    return NextResponse.json(scans);
  } catch (_err) {
    return NextResponse.json({ error: 'Failed to fetch scans' }, { status: 500 });
  }
}
