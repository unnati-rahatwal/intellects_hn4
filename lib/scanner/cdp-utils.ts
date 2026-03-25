import { Page as PlaywrightPage } from 'playwright';

interface AxeViolation {
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
  violations: AxeViolation[]
): Promise<void> {
  const cdpSession = await page.context().newCDPSession(page);

  const deficiencies = [
    'achromatopsia',
    'deuteranopia',
    'protanopia',
    'tritanopia',
  ] as const;

  // Check for color-contrast violations specifically
  const colorViolations = violations.filter(
    (v) => v.id.includes('color-contrast') || v.id.includes('contrast')
  );

  if (colorViolations.length === 0) {
    await cdpSession.detach();
    return;
  }

  for (const deficiency of deficiencies) {
    try {
      await cdpSession.send('Emulation.setEmulatedVisionDeficiency', {
        type: deficiency,
      });

      // Capture screenshot under this vision deficiency
      for (const violation of colorViolations.slice(0, 3)) {
        const selector = violation.nodes?.[0]?.target?.[0];
        if (selector && typeof selector === 'string') {
          try {
            await page.locator(selector).first().screenshot({
              type: 'png',
            });
            // In a production system, we'd upload this to storage
            // and save the URL to the violation document
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
