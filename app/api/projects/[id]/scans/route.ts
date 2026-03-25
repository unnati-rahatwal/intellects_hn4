import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Scan } from '@/lib/models/scan';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const scans = await Scan.find({ projectId: id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(scans);
  } catch (error) {
    console.error('GET /api/projects/[id]/scans error:', error);
    return NextResponse.json({ error: 'Failed to fetch scans' }, { status: 500 });
  }
}
