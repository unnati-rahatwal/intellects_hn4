import { chromium, Browser, BrowserContext, Page as PlaywrightPage } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import connectDB from '../db';
import { Scan } from '../models/scan';
import { Page } from '../models/page';
import { Violation, IViolation } from '../models/violation';
import { discoverRoutes } from './route-discovery';
import { analyzeSecurityHeaders, extractSecurityContext } from './security';
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

type StageScreenshot = {
  stage: 'PAGE_LOADED' | 'CDP_CAPTURED' | 'AXE_ANALYZED' | 'VISION_EMULATION' | 'FINAL';
  imageData: string;
  capturedAt: Date;
};

async function captureStageScreenshot(
  page: PlaywrightPage,
  stage: StageScreenshot['stage']
): Promise<StageScreenshot | null> {
  try {
    const buffer = await page.screenshot({
      fullPage: true,
      type: 'jpeg',
      quality: 60,
    });

    return {
      stage,
      imageData: `data:image/jpeg;base64,${buffer.toString('base64')}`,
      capturedAt: new Date(),
    };
  } catch {
    return null;
  }
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
        const stageScreenshots: StageScreenshot[] = [];

        const response = await page.goto(url, {
          waitUntil: 'networkidle',
          timeout: 30000,
        });

        const pageLoadedShot = await captureStageScreenshot(page, 'PAGE_LOADED');
        if (pageLoadedShot) stageScreenshots.push(pageLoadedShot);

        const loadTimeMs = Date.now() - startTime;

        // Security headers analysis
        let securityHeaders = null;
        let extractedSecurityContext = null;
        if (options.securityAudit && response) {
          securityHeaders = analyzeSecurityHeaders(response.headers());
          extractedSecurityContext = await extractSecurityContext(page);
        }

        // Parallel CDP Data Collection
        const [axTree, browserIssues, rawPerfMetrics] = await Promise.all([
          getAccessibilityTree(page),
          getBrowserAuditIssues(page),
          getPerformanceMetrics(page)
        ]);

        const cdpCapturedShot = await captureStageScreenshot(page, 'CDP_CAPTURED');
        if (cdpCapturedShot) stageScreenshots.push(cdpCapturedShot);

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

        const axeAnalyzedShot = await captureStageScreenshot(page, 'AXE_ANALYZED');
        if (axeAnalyzedShot) stageScreenshots.push(axeAnalyzedShot);

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
        const colorContrastDocs: { doc: IViolation; selector: string }[] = [];

        for (const violation of violations) {
          for (const node of violation.nodes) {
            // Extract bounding box
            let boundingBox = null;
            let violationScreenshotPath: string | undefined;
            let selector = '';
            try {
              const target = node.target?.[0];
              selector = Array.isArray(target) ? target.join(' ') : String(target);
              if (selector) {
                const element = page.locator(selector).first();
                boundingBox = await element.boundingBox();

                try {
                  const elementShot = await element.screenshot({
                    type: 'jpeg',
                    quality: 60,
                  });
                  violationScreenshotPath = `data:image/jpeg;base64,${elementShot.toString('base64')}`;
                } catch {
                  // Some elements cannot be captured directly; fallback to page clip below.
                }
              }
            } catch {
              // Bounding box might fail for hidden elements
            }

            if (!violationScreenshotPath && boundingBox && boundingBox.width > 1 && boundingBox.height > 1) {
              try {
                const clipShot = await page.screenshot({
                  type: 'jpeg',
                  quality: 60,
                  clip: {
                    x: Math.max(0, boundingBox.x),
                    y: Math.max(0, boundingBox.y),
                    width: Math.max(1, boundingBox.width),
                    height: Math.max(1, boundingBox.height),
                  },
                });
                violationScreenshotPath = `data:image/jpeg;base64,${clipShot.toString('base64')}`;
              } catch {
                // Non-critical if screenshot capture fails.
              }
            }

            const impact = (violation.impact || 'moderate') as 'minor' | 'moderate' | 'serious' | 'critical';

            const doc = await Violation.create({
              scanId,
              pageUrl: url,
              ruleId: violation.id,
              impact,
              description: violation.description,
              failureSummary: node.failureSummary || violation.help,
              htmlSnippet: (node.html || '').slice(0, 5000),
              cssSelector: Array.isArray(node.target) ? node.target.join(' ') : String(node.target),
              boundingBox,
              screenshotPath: violationScreenshotPath,
              wcagCriteria: violation.tags?.filter((t: string) => t.startsWith('wcag')) || [],
              tags: violation.tags || [],
            });

            if (violation.id.includes('color-contrast') || violation.id.includes('contrast')) {
              let selector = '';
              if (Array.isArray(node.target) && node.target.length > 0) {
                 selector = Array.isArray(node.target[0]) ? node.target[0].join(' ') : String(node.target[0]);
              } else {
                 selector = String(node.target);
              }
              colorContrastDocs.push({ doc, selector });
            }

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
        if (options.visionEmulation && colorContrastDocs.length > 0) {
          try {
            await captureVisionDeficiencyScreenshots(page, colorContrastDocs);
            const visionShot = await captureStageScreenshot(page, 'VISION_EMULATION');
            if (visionShot) stageScreenshots.push(visionShot);
          } catch {
            // Non-critical, continue
          }
        }

        if (screenshotPath) {
          stageScreenshots.push({
            stage: 'FINAL',
            imageData: screenshotPath,
            capturedAt: new Date(),
          });
        }

        await Page.findByIdAndUpdate(pageDoc._id, {
          status: 'COMPLETED',
          violationCount: pageViolationCount,
          accessibilityScore: pageScore,
          screenshotPath,
          stageScreenshots,
          securityHeaders,
          extractedSecurityContext,
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
    
    // Aggregate security scores from pages
    let avgSecurityScore = 100;
    const pagesWithSecurity = await Page.find({ scanId, securityHeaders: { $ne: null } });
    if (pagesWithSecurity.length > 0) {
      const sum = pagesWithSecurity.reduce((acc, p) => acc + (p.securityHeaders?.score || 0), 0);
      avgSecurityScore = Math.round(sum / pagesWithSecurity.length);
    }

    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const performanceSummary = {
      avgLoadTime: avg(scanPerformanceAggregate.loadTime),
      avgFcp: avg(scanPerformanceAggregate.fcp),
      avgTaskDuration: avg(scanPerformanceAggregate.taskDuration)
    };

    await Scan.findByIdAndUpdate(scanId, {
      status: 'COMPLETED',
      accessibilityScore: avgScore,
      securityScore: avgSecurityScore,
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
