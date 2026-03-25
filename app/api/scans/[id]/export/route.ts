import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Scan } from '@/lib/models/scan';
import { Page } from '@/lib/models/page';
import { Violation } from '@/lib/models/violation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const scan = await Scan.findById(id).lean();
    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    const pages = await Page.find({ scanId: id }).lean();
    const violations = await Violation.find({ scanId: id }).lean();

    const exportData = {
      scan,
      pages,
      violations,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="a11y-audit-${id}.json"`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Export generation failed:', error);
    return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 });
  }
}
