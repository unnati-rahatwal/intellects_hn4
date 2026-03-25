import { Page } from 'playwright';

export async function discoverRoutes(
  page: Page,
  baseUrl: string,
  maxDepth: number = 3
): Promise<string[]> {
  const discovered = new Set<string>();
  const visited = new Set<string>();
  const baseOrigin = new URL(baseUrl).origin;

  // Layer 1: Static sitemap parsing
  try {
    const sitemapUrls = await fetchSitemapUrls(baseUrl);
    sitemapUrls.forEach((url) => discovered.add(url));
  } catch {
    // Sitemap might not exist
  }

  // Layer 2: DOM link extraction + Layer 3: History API interception
  const queue: { url: string; depth: number }[] = [{ url: baseUrl, depth: 0 }];

  while (queue.length > 0 && discovered.size < 100) {
    const item = queue.shift();
    if (!item || item.depth > maxDepth) continue;
    if (visited.has(item.url)) continue;
    visited.add(item.url);

    try {
      await page.goto(item.url, {
        waitUntil: 'networkidle',
        timeout: 15000,
      });

      // Extract links from DOM
      const links = await page.evaluate((origin: string) => {
        const anchors = document.querySelectorAll('a[href]');
        const urls: string[] = [];

        anchors.forEach((anchor) => {
          try {
            const href = anchor.getAttribute('href');
            if (!href) return;

            const resolved = new URL(href, window.location.href);

            // Same-origin only
            if (resolved.origin !== origin) return;

            // Skip non-page URLs
            const ext = resolved.pathname.split('.').pop()?.toLowerCase();
            const skipExts = ['js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico',
              'woff', 'woff2', 'ttf', 'eot', 'pdf', 'zip', 'mp3', 'mp4'];
            if (ext && skipExts.includes(ext)) return;

            // Clean URL
            resolved.hash = '';
            urls.push(resolved.href);
          } catch {
            // Invalid URL
          }
        });

        return [...new Set(urls)];
      }, baseOrigin);

      for (const link of links) {
        if (!discovered.has(link) && !visited.has(link)) {
          discovered.add(link);
          if (item.depth + 1 <= maxDepth) {
            queue.push({ url: link, depth: item.depth + 1 });
          }
        }
      }

      // Layer 3: Try to extract Next.js routes from __NEXT_DATA__
      try {
        const nextRoutes = await page.evaluate(() => {
          const nextDataEl = document.getElementById('__NEXT_DATA__');
          if (!nextDataEl) return [];

          try {
            const data = JSON.parse(nextDataEl.textContent || '{}');
            const routes: string[] = [];

            // Extract page path
            if (data.page) routes.push(data.page);

            // Extract dynamic routes from route manifest if available
            if (data.buildManifest?.sortedPages) {
              routes.push(...data.buildManifest.sortedPages);
            }

            return routes;
          } catch {
            return [];
          }
        });

        for (const route of nextRoutes) {
          if (route && !route.includes('[') && !route.startsWith('/_')) {
            const fullUrl = `${baseOrigin}${route}`;
            discovered.add(fullUrl);
          }
        }
      } catch {
        // Not a Next.js app
      }

      // Inject History API interceptor for SPA route detection
      try {
        const spaRoutes = await page.evaluate((origin: string) => {
          return new Promise<string[]>((resolve) => {
            const routes: string[] = [];

            const originalPushState = history.pushState;
            history.pushState = function (...args) {
              if (args[2] && typeof args[2] === 'string') {
                try {
                  const url = new URL(args[2], origin);
                  if (url.origin === origin) routes.push(url.href);
                } catch { /* ignore */ }
              }
              return originalPushState.apply(this, args);
            };

            // Click around briefly to trigger route changes
            const navLinks = document.querySelectorAll('nav a, header a, [role="navigation"] a');
            navLinks.forEach((link) => {
              try {
                (link as HTMLElement).click();
              } catch { /* ignore */ }
            });

            // Wait briefly for any route changes to register
            setTimeout(() => {
              history.pushState = originalPushState;
              resolve(routes);
            }, 500);
          });
        }, baseOrigin);

        spaRoutes.forEach((url) => discovered.add(url));
      } catch {
        // SPA detection failed, no problem
      }
    } catch {
      // Page failed to load, skip
    }
  }

  return Array.from(discovered).sort();
}

async function fetchSitemapUrls(baseUrl: string): Promise<string[]> {
  const origin = new URL(baseUrl).origin;
  const urls: string[] = [];

  // Try robots.txt first
  try {
    const robotsResponse = await fetch(`${origin}/robots.txt`);
    if (robotsResponse.ok) {
      const text = await robotsResponse.text();
      const sitemapMatches = text.match(/Sitemap:\s*(.+)/gi);
      if (sitemapMatches) {
        for (const match of sitemapMatches) {
          const sitemapUrl = match.replace(/Sitemap:\s*/i, '').trim();
          const sitemapUrls = await parseSitemap(sitemapUrl);
          urls.push(...sitemapUrls);
        }
        if (urls.length > 0) return urls;
      }
    }
  } catch {
    // robots.txt not available
  }

  // Try common sitemap locations
  const sitemapLocations = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap/sitemap.xml`,
  ];

  for (const loc of sitemapLocations) {
    try {
      const sitemapUrls = await parseSitemap(loc);
      if (sitemapUrls.length > 0) {
        urls.push(...sitemapUrls);
        break;
      }
    } catch {
      continue;
    }
  }

  return urls;
}

async function parseSitemap(url: string): Promise<string[]> {
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) return [];

  const text = await response.text();
  const urls: string[] = [];

  // Extract <loc> tags
  const locMatches = text.match(/<loc>([^<]+)<\/loc>/gi);
  if (locMatches) {
    for (const match of locMatches) {
      const locUrl = match.replace(/<\/?loc>/g, '').trim();

      // Check if it's a sitemap index (nested sitemap)
      if (locUrl.endsWith('.xml')) {
        try {
          const nestedUrls = await parseSitemap(locUrl);
          urls.push(...nestedUrls);
        } catch {
          // Skip broken nested sitemaps
        }
      } else {
        urls.push(locUrl);
      }
    }
  }

  return urls;
}
