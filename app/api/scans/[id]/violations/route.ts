import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Violation } from '@/lib/models/violation';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const searchParams = req.nextUrl.searchParams;
    const impact = searchParams.get('impact');
    const pageUrl = searchParams.get('pageUrl');
    const ruleId = searchParams.get('ruleId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const filter: Record<string, unknown> = { scanId: id };
    if (impact) filter.impact = impact;
    if (pageUrl) filter.pageUrl = pageUrl;
    if (ruleId) filter.ruleId = ruleId;

    const skip = (page - 1) * limit;

    const [violations, total] = await Promise.all([
      Violation.find(filter)
        .sort({ impact: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Violation.countDocuments(filter),
    ]);

    return NextResponse.json({
      violations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/scans/[id]/violations error:', error);
    return NextResponse.json({ error: 'Failed to fetch violations' }, { status: 500 });
  }
}
