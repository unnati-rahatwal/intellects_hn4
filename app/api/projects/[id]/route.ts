import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Project } from '@/lib/models/project';
import { Scan } from '@/lib/models/scan';
import { Violation } from '@/lib/models/violation';
import { Page } from '@/lib/models/page';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const project = await Project.findById(id).lean();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get latest scan summary
    const latestScan = await Scan.findOne({ projectId: id })
      .sort({ createdAt: -1 })
      .lean();

    const totalScans = await Scan.countDocuments({ projectId: id });

    return NextResponse.json({
      ...project,
      latestScan,
      totalScans,
    });
  } catch (error) {
    console.error('GET /api/projects/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const project = await Project.findById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Cascade delete: scans, violations, pages
    const scans = await Scan.find({ projectId: id }).select('_id');
    const scanIds = scans.map((s) => s._id);

    await Violation.deleteMany({ scanId: { $in: scanIds } });
    await Page.deleteMany({ scanId: { $in: scanIds } });
    await Scan.deleteMany({ projectId: id });
    await Project.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Project deleted' });
  } catch (error) {
    console.error('DELETE /api/projects/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    
    const body = await req.json();
    const { githubRepo } = body;

    const project = await Project.findByIdAndUpdate(id, { githubRepo }, { new: true });
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('PUT /api/projects/[id] error:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}
