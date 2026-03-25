import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Scan } from '@/lib/models/scan';
import { generateReportVideo } from '@/lib/video';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    // Find the scan
    const scan = await Scan.findById(id);
    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // Check if video already generated
    if (scan.videoUrl) {
      return NextResponse.json(
        { videoUrl: scan.videoUrl, status: 'ALREADY_GENERATED' },
        { status: 200 }
      );
    }

    // Ensure AI summary exists
    if (!scan.aiSummary?.executiveSummary) {
      return NextResponse.json(
        { error: 'AI summary not yet generated. Wait for summary generation to complete.' },
        { status: 400 }
      );
    }

    // Update status to GENERATING
    await Scan.findByIdAndUpdate(id, {
      videoGenerationStatus: 'GENERATING',
    });

    // Generate the video
    const result = await generateReportVideo({
      score: scan.accessibilityScore,
      totalViolations: scan.totalViolations,
      criticalIssues: scan.criticalIssues,
      keyFindings: scan.aiSummary?.keyFindings || [],
      recommendations: scan.aiSummary?.recommendations || [],
      targetUrl: scan.targetUrls[0] || 'Unknown URL',
    });

    if (result.status === 'FAILED') {
      await Scan.findByIdAndUpdate(id, {
        videoGenerationStatus: 'FAILED',
      });

      return NextResponse.json(
        { error: `Video generation failed: ${result.error}` },
        { status: 500 }
      );
    }

    // Store video URL in database
    await Scan.findByIdAndUpdate(id, {
      videoUrl: result.videoUrl,
      videoGeneratedAt: new Date(),
      videoGenerationStatus: 'COMPLETED',
    });

    return NextResponse.json(
      { videoUrl: result.videoUrl, status: 'COMPLETED' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Video generation API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate video' },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    const scan = await Scan.findById(id).select('videoUrl videoGenerationStatus');
    if (!scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    return NextResponse.json({
      videoUrl: scan.videoUrl || null,
      status: scan.videoGenerationStatus || 'PENDING',
    });
  } catch (error) {
    console.error('Video status API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video status' },
      { status: 500 }
    );
  }
}
