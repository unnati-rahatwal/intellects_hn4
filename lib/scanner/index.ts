import { chromium, Browser, BrowserContext, Page as PlaywrightPage } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import connectDB from '@/lib/db';
import { Scan } from '@/lib/models/scan';
import { Violation } from '@/lib/models/violation';
import { Page } from '@/lib/models/page';
import { discoverRoutes } from './route-discovery';
import { analyzeSecurityHeaders } from './security';
import {
  captureVisionDeficiencyScreenshots,
  getAccessibilityTree,
  getBrowserAuditIssues,
  getPerformanceMetrics
} from './cdp-utils';

export interface ScanOptions {
  discoverRoutes: boolean;
  maxDepth: number;
  includeShadowDom: boolean;
  includeIframes: boolean;
  visionEmulation: boolean;
  securityAudit: boolean;
}

async function logProgress(
  scanId: string,
  message: string,
  status: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' = 'INFO'
) {
  try {
    await Scan.findByIdAndUpdate(scanId, {
      $push: {
        progressLog: {
          message,
          timestamp: new Date(),
          status,
        },
      },
    });
    console.log(`[SCAN ${scanId}] ${message}`);
  } catch (err) {
    console.error(`Failed to log progress: ${err}`);
  }
}

export async function runScan(
  scanId: string,
  urls: string[],
  options: ScanOptions
): Promise<void> {
  await connectDB();

  const scan = await Scan.findById(scanId);
  if (!scan) throw new Error(`Scan ${scanId} not found`);

  await Scan.findByIdAndUpdate(scanId, {
    status: 'PROCESSING',
    startedAt: new Date(),
    progressLog: [{ message: 'Initializing accessibility audit engine...', timestamp: new Date(), status: 'INFO' }],
  });

  await logProgress(scanId, 'Connecting to browser engine...');

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    await logProgress(scanId, 'Browser engine ready.');

    // Route discovery
    let allUrls = [...urls];
    if (options.discoverRoutes && urls.length > 0) {
      try {
        await logProgress(scanId, `Starting deep route discovery for ${urls[0]}...`);
        const context = await browser.newContext();
        const page = await context.newPage();
        const discovered = await discoverRoutes(page, urls[0], options.maxDepth);
        allUrls = [...new Set([...urls, ...discovered])];
        await context.close();
        await logProgress(scanId, `Discovered ${allUrls.length} total pages.`, 'SUCCESS');
      } catch (err) {
        console.error('Route discovery failed, continuing with provided URLs:', err);
      }
    }

    await Scan.findByIdAndUpdate(scanId, {
      discoveredRoutes: allUrls,
    });

    let totalViolations = 0;
    let criticalCount = 0;
    let seriousCount = 0;
    let moderateCount = 0;
    let minorCount = 0;
    let pagesScanned = 0;
    let totalScore = 0;

    const scanPerformanceAggregate: Record<string, number[]> = {
      fcp: [],
      taskDuration: [],
      loadTime: []
    };

    // Scan each URL
    await logProgress(scanId, `Starting accessibility audit for ${allUrls.length} pages...`);

    for (const url of allUrls) {
      await logProgress(scanId, `Analyzing page: ${new URL(url).pathname || '/'}...`);
      const context: BrowserContext = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
      });
      const page: PlaywrightPage = await context.newPage();

      const pageDoc = await Page.create({
        scanId,
        url,
        status: 'SCANNING',
      });

      try {
        const startTime = Date.now();

        const response = await page.goto(url, {
          waitUntil: 'networkidle',
          timeout: 30000,
        });

        const loadTimeMs = Date.now() - startTime;

        // Security headers analysis
        let securityHeaders = null;
        if (options.securityAudit && response) {
          securityHeaders = analyzeSecurityHeaders(response.headers());
        }

        // Parallel CDP Data Collection
        const [axTree, browserIssues, rawPerfMetrics] = await Promise.all([
          getAccessibilityTree(page),
          getBrowserAuditIssues(page),
          getPerformanceMetrics(page)
        ]);

        const fcp = rawPerfMetrics['FirstContentfulPaint'] || 0;
        const taskDuration = rawPerfMetrics['TaskDuration'] || 0;

        if (fcp > 0) scanPerformanceAggregate.fcp.push(fcp);
        if (taskDuration > 0) scanPerformanceAggregate.taskDuration.push(taskDuration);
        scanPerformanceAggregate.loadTime.push(loadTimeMs);

        const performanceMetrics = {
          ...rawPerfMetrics,
          loadTimeMs,
          fcp,
          taskDuration
        };

        // Run axe-core accessibility audit
        const axeConfig: Record<string, unknown> = {};
        if (options.includeShadowDom) {
          (axeConfig as Record<string, boolean>).allowedOrigins = true;
        }

        let axeBuilder = new AxeBuilder({ page });
        if (options.includeIframes) {
          axeBuilder = axeBuilder.withTags([
            'wcag2a',
            'wcag2aa',
            'wcag2aaa',
            'wcag21a',
            'wcag21aa',
            'wcag22aa',
            'best-practice',
          ]);
        }

        const results = await axeBuilder.analyze();
        await logProgress(scanId, `Completed accessibility audit for ${new URL(url).pathname || '/'}`, 'SUCCESS');

        // Take full-page screenshot
        let screenshotPath: string | undefined;
        try {
          const screenshotBuffer = await page.screenshot({
            fullPage: true,
            type: 'png',
          });
          screenshotPath = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;
        } catch {
          // Screenshot might fail for some pages
        }

        // Process violations
        const violations = results.violations;
        let pageViolationCount = 0;

        for (const violation of violations) {
          for (const node of violation.nodes) {
            // Extract bounding box
            let boundingBox = null;
            try {
              const selector = node.target?.[0];
              if (selector && typeof selector === 'string') {
                const element = page.locator(selector).first();
                boundingBox = await element.boundingBox();
              }
            } catch {
              // Bounding box might fail for hidden elements
            }

            const impact = (violation.impact || 'moderate') as 'minor' | 'moderate' | 'serious' | 'critical';

            await Violation.create({
              scanId,
              pageUrl: url,
              ruleId: violation.id,
              impact,
              description: violation.description,
              failureSummary: node.failureSummary || violation.help,
              htmlSnippet: (node.html || '').slice(0, 5000),
              cssSelector: Array.isArray(node.target) ? node.target.join(' ') : String(node.target),
              boundingBox,
              screenshotPath: undefined,
              wcagCriteria: violation.tags?.filter((t: string) => t.startsWith('wcag')) || [],
              tags: violation.tags || [],
            });

            pageViolationCount++;
            totalViolations++;

            switch (impact) {
              case 'critical': criticalCount++; break;
              case 'serious': seriousCount++; break;
              case 'moderate': moderateCount++; break;
              case 'minor': minorCount++; break;
            }
          }
        }

        // Calculate page score (simple weighted formula)
        const passCount = results.passes?.length || 0;
        const totalChecks = passCount + violations.length;
        const pageScore = totalChecks > 0
          ? Math.round((passCount / totalChecks) * 100)
          : 100;

        totalScore += pageScore;

        // Vision deficiency screenshots
        if (options.visionEmulation && violations.length > 0) {
          try {
            await captureVisionDeficiencyScreenshots(page, violations.slice(0, 3) as unknown as import('./cdp-utils').AxeViolation[]);
          } catch {
            // Non-critical, continue
          }
        }

        await Page.findByIdAndUpdate(pageDoc._id, {
          status: 'COMPLETED',
          violationCount: pageViolationCount,
          accessibilityScore: pageScore,
          screenshotPath,
          securityHeaders,
          loadTimeMs,
          performanceMetrics,
          browserIssues,
          accessibilityTreeSnapshot: axTree
        });

        pagesScanned++;
      } catch (err) {
        console.error(`Error scanning ${url}:`, err);
        await Page.findByIdAndUpdate(pageDoc._id, {
          status: 'FAILED',
        });
        pagesScanned++;
      } finally {
        await context.close();
      }
    }

    // Finalize scan
    const avgScore = pagesScanned > 0 ? Math.round(totalScore / pagesScanned) : 0;

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const performanceSummary = {
      avgLoadTime: avg(scanPerformanceAggregate.loadTime),
      avgFcp: avg(scanPerformanceAggregate.fcp),
      avgTaskDuration: avg(scanPerformanceAggregate.taskDuration)
    };

    await Scan.findByIdAndUpdate(scanId, {
      status: 'COMPLETED',
      accessibilityScore: avgScore,
      totalViolations,
      criticalIssues: criticalCount,
      seriousIssues: seriousCount,
      moderateIssues: moderateCount,
      minorIssues: minorCount,
      pagesScanned,
      completedAt: new Date(),
      performanceSummary,
    });

    await logProgress(scanId, `Accessibility audit completed. Found ${totalViolations} issues across ${pagesScanned} pages.`, 'SUCCESS');
  } catch (error) {
    console.error('Scan failed:', error);
    await Scan.findByIdAndUpdate(scanId, {
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      completedAt: new Date(),
    });
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
