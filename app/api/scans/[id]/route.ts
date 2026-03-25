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

    const scan = await Scan.findById(id).lean();
    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    return NextResponse.json(scan);
  } catch (error) {
    console.error('GET /api/scans/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch scan' }, { status: 500 });
  }
}
