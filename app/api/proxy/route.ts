import { NextRequest, NextResponse } from 'next/server';
import { isPrivateUrl } from '@/lib/scanner/security';

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'url parameter is required' }, { status: 400 });
    }

    // SSRF prevention
    if (isPrivateUrl(url)) {
      return NextResponse.json(
        { error: 'Cannot proxy private or local URLs' },
        { status: 403 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'A11y-Audit-Platform/1.0',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status}` },
        { status: response.status }
      );
    }

    const html = await response.text();

    // Inject base tag to fix relative URLs
    const baseTag = `<base href="${url}">`;
    const modifiedHtml = html.replace(
      /<head([^>]*)>/i,
      `<head$1>${baseTag}`
    );

    return new NextResponse(modifiedHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // Remove security headers that block iframe embedding
        'X-Frame-Options': 'ALLOWALL',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('GET /api/proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy URL' },
      { status: 500 }
    );
  }
}
