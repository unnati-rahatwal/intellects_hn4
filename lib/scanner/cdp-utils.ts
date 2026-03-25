import { Page as PlaywrightPage } from 'playwright';
import { IViolation } from '../models/violation';

export interface AxeViolation {
  id: string;
  impact?: string;
  nodes: Array<{
    target?: Array<string | string[]>;
    html?: string;
    failureSummary?: string;
  }>;
}

export async function captureVisionDeficiencyScreenshots(
  page: PlaywrightPage,
  colorDocs: { doc: IViolation; selector: string }[]
): Promise<void> {
  const cdpSession = await page.context().newCDPSession(page);

  const deficiencies = [
    'achromatopsia',
    'deuteranopia',
    'protanopia',
    'tritanopia',
  ] as const;

  if (colorDocs.length === 0) {
    await cdpSession.detach();
    return;
  }

  // Initialize arrays
  for (const item of colorDocs) {
    if (!item.doc.visionDeficiencies) {
      item.doc.visionDeficiencies = [];
    }
  }

  for (const deficiency of deficiencies) {
    try {
      await cdpSession.send('Emulation.setEmulatedVisionDeficiency', {
        type: deficiency,
      });

      // Wait a moment for layout/colors to update
      await new Promise(r => setTimeout(r, 500));

      // Capture screenshot under this vision deficiency
      for (const item of colorDocs.slice(0, 3)) { // Limit to 3 to save time/space
        if (item.selector) {
          try {
            const buffer = await page.locator(item.selector).first().screenshot({
              type: 'png',
            });
            const base64Image = `data:image/png;base64,${buffer.toString('base64')}`;
            item.doc.visionDeficiencies.push({
              type: deficiency,
              base64Image,
            });
          } catch {
            // Element might not be visible
          }
        }
      }
    } catch {
      // CDP command might fail
    }
  }

  // Reset vision deficiency
  try {
    await cdpSession.send('Emulation.setEmulatedVisionDeficiency', {
      type: 'none',
    });
  } catch {
    // ignore
  }

  await cdpSession.detach();

  // Save the updated documents to the database
  for (const item of colorDocs.slice(0, 3)) {
    try {
      await item.doc.save();
    } catch (err) {
      console.error('Failed to save vision deficiency screenshots:', err);
    }
  }
}

export async function getAccessibilityTree(
  page: PlaywrightPage
): Promise<unknown> {
  const cdpSession = await page.context().newCDPSession(page);

  try {
    const result = await cdpSession.send('Accessibility.getFullAXTree');
    return result;
  } catch (err) {
    console.error('Failed to get accessibility tree:', err);
    return null;
  } finally {
    await cdpSession.detach();
  }
}

export async function getBrowserAuditIssues(
  page: PlaywrightPage
): Promise<unknown[]> {
  const cdpSession = await page.context().newCDPSession(page);
  const issues: unknown[] = [];

  try {
    cdpSession.on('Audits.issueAdded', (params: Record<string, unknown>) => {
      issues.push(params);
    });

    await cdpSession.send('Audits.enable');

    // Wait briefly for issues to collect
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await cdpSession.send('Audits.disable');
  } catch {
    // CDP audit might not be available
  } finally {
    await cdpSession.detach();
  }

  return issues;
}

export async function getPerformanceMetrics(
  page: PlaywrightPage
): Promise<Record<string, number>> {
  const cdpSession = await page.context().newCDPSession(page);
  try {
    await cdpSession.send('Performance.enable');
    const { metrics } = await cdpSession.send('Performance.getMetrics');
    
    const result: Record<string, number> = {};
    for (const metric of metrics) {
      if (
        ['FirstContentfulPaint', 'DomContentLoaded', 'NavigationStart', 'TaskDuration', 'LayoutCount', 'RecalcStyleCount'].includes(metric.name)
      ) {
        result[metric.name] = metric.value;
      }
    }
    return result;
  } catch (err) {
    console.error('Failed to get performance metrics:', err);
    return {};
  } finally {
    await cdpSession.send('Performance.disable').catch(() => {});
    await cdpSession.detach();
  }
}

