import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Page } from '@/lib/models/page';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const pages = await Page.find({ scanId: id })
      .sort({ accessibilityScore: 1 })
      .lean();

    return NextResponse.json(pages);
  } catch (error) {
    console.error('GET /api/scans/[id]/pages error:', error);
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 });
  }
}
