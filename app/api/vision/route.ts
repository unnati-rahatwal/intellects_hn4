import { NextResponse } from 'next/server';
import { generateVisionAnalysis } from '@/lib/featherless';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    // Call Featherless Vision API
    const result = await generateVisionAnalysis(imageUrl);

    return NextResponse.json(result);
  } catch (error) {
    console.error('POST /api/vision error:', error);
    return NextResponse.json({ error: 'Failed to process vision analysis' }, { status: 500 });
  }
}
