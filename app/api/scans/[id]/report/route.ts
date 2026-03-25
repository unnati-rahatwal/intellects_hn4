import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Scan } from '@/lib/models/scan';
import { Page } from '@/lib/models/page';
import { Violation } from '@/lib/models/violation';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const [scan, pages, violations] = await Promise.all([
      Scan.findById(id).lean(),
      Page.find({ scanId: id }).lean(),
      Violation.find({ scanId: id }).lean()
    ]);

    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    return NextResponse.json({
      scan,
      pages,
      violations
    });
  } catch (error) {
    console.error('GET /api/scans/[id]/report error:', error);
    return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
  }
}
