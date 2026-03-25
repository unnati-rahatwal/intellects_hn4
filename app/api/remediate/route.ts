import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Violation } from '@/lib/models/violation';
import { generateRemediation } from '@/lib/featherless';

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = await request.json();

    const { violationId } = body;
    if (!violationId) {
      return NextResponse.json({ error: 'violationId is required' }, { status: 400 });
    }

    const violation = await Violation.findById(violationId);
    if (!violation) {
      return NextResponse.json({ error: 'Violation not found' }, { status: 404 });
    }

    if (violation.aiRemediation.status === 'GENERATED') {
      return NextResponse.json({
        message: 'Remediation already generated',
        remediation: violation.aiRemediation,
      });
    }

    try {
      const result = await generateRemediation(
        violation.ruleId,
        violation.failureSummary,
        violation.htmlSnippet,
        violation.description
      );

      violation.aiRemediation = {
        analysis: result.analysis,
        remediatedCode: result.remediatedCode,
        explanation: result.explanation,
        status: 'GENERATED',
      };

      await violation.save();

      return NextResponse.json({
        message: 'Remediation generated successfully',
        remediation: violation.aiRemediation,
      });
    } catch (aiError) {
      violation.aiRemediation.status = 'FAILED';
      await violation.save();

      const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown error';
      return NextResponse.json(
        { error: `AI remediation failed: ${errorMessage}` },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error('POST /api/remediate error:', error);
    return NextResponse.json({ error: 'Failed to process remediation' }, { status: 500 });
  }
}
