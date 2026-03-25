import { NextResponse } from 'next/server';
import { isPrivateUrl } from '@/lib/scanner/security';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    if (isPrivateUrl(url)) {
      return NextResponse.json(
        { error: 'Cannot scan private or local URLs' },
        { status: 403 }
      );
    }

    // For route discovery without Playwright, do a lightweight version
    const origin = new URL(url).origin;
    const discoveredUrls: string[] = [url];

    // Try fetching sitemap.xml
    try {
      const sitemapResponse = await fetch(`${origin}/sitemap.xml`, {
        signal: AbortSignal.timeout(5000),
      });

      if (sitemapResponse.ok) {
        const sitemapText = await sitemapResponse.text();
        const locMatches = sitemapText.match(/<loc>([^<]+)<\/loc>/gi);

        if (locMatches) {
          for (const match of locMatches) {
            const locUrl = match.replace(/<\/?loc>/g, '').trim();
            if (!locUrl.endsWith('.xml')) {
              discoveredUrls.push(locUrl);
            }
          }
        }
      }
    } catch {
      // Sitemap not available
    }

    // Try robots.txt
    try {
      const robotsResponse = await fetch(`${origin}/robots.txt`, {
        signal: AbortSignal.timeout(5000),
      });

      if (robotsResponse.ok) {
        const robotsText = await robotsResponse.text();
        const sitemapMatches = robotsText.match(/Sitemap:\s*(.+)/gi);
        if (sitemapMatches) {
          for (const match of sitemapMatches) {
            const sitemapUrl = match.replace(/Sitemap:\s*/i, '').trim();
            if (!discoveredUrls.includes(sitemapUrl)) {
              discoveredUrls.push(sitemapUrl);
            }
          }
        }
      }
    } catch {
      // robots.txt not available
    }

    return NextResponse.json({
      baseUrl: url,
      discoveredUrls: [...new Set(discoveredUrls)],
      count: new Set(discoveredUrls).size,
      note: 'Full route discovery with SPA crawling requires the scanner worker. This is a lightweight preview.',
    });
  } catch (error) {
    console.error('POST /api/discover-routes error:', error);
    return NextResponse.json({ error: 'Failed to discover routes' }, { status: 500 });
  }
}
