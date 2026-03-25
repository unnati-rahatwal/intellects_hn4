const FEATHERLESS_API_URL = 'https://api.featherless.ai/v1/chat/completions';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface ViolationInput {
  id: string;
  ruleId: string;
  failureSummary: string;
  htmlSnippet: string;
  description: string;
}

export interface BatchRemediationResult {
  id: string;
  analysis: string;
  remediatedCode: string;
  explanation: string;
}

function buildBatchRemediationPrompt(
  violations: ViolationInput[]
): string {
  return `You are an expert Web Accessibility (a11y) Engineer. You have been provided a list of accessibility violations.
For each violation, diagnose the exact failure, provide the remediated code, and explain the fix.

Violations to Remediate:
${JSON.stringify(violations, null, 2)}

Task for EACH violation:
1. "analysis": A 1-2 sentence specific diagnosis of exactly why the htmlSnippet fails the ruleId. Do NOT just repeat the description. Look at the specific HTML tags and attributes provided.
2. "remediatedCode": The exact HTML code rewritten to fix the issue. Only provide the corrected code snippet.
3. "explanation": A very brief 1-sentence mechanical explanation of what you changed.

CRITICAL INSTRUCTION: You MUST output ONLY a valid JSON array matching this exact string schema. Do not use any markdown formatting outside the JSON array. Make sure the 'id' correctly matches the input 'id'.
[
  {
    "id": "string",
    "analysis": "string",
    "remediatedCode": "string",
    "explanation": "string"
  }
]`;
}

export interface ScanSummaryResult {
  executiveSummary: string;
  keyFindings: string[];
  recommendations: string[];
}

function tryParseJSON(text: string): any {
  // Attempt 1: direct parse
  try {
    return JSON.parse(text);
  } catch {
    // continue
  }

  // Attempt 2: strip markdown code fences
  try {
    const cleaned = text
      .replace(/```json\s*\n?/g, '')
      .replace(/```\s*\n?/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch {
    // continue
  }

  // Attempt 3: extract JSON object from text
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // continue
  }

  return null;
}

export async function generateBatchRemediations(
  violations: ViolationInput[]
): Promise<BatchRemediationResult[]> {
  if (!violations || violations.length === 0) return [];

  const apiKey = process.env.FEATHERLESS_API_KEY;
  // Use an ultra-small model for high-frequency minor remediations (highest rate limits)
  const model = process.env.FEATHERLESS_SMALL_MODEL || 'Qwen/Qwen2.5-0.5B-Instruct';

  if (!apiKey || apiKey === 'your-key-here') {
    throw new Error('FEATHERLESS_API_KEY not configured');
  }

  const prompt = buildBatchRemediationPrompt(violations);

  for (let attempt = 0; attempt < 2; attempt++) {
    const messages = [
      {
        role: 'user' as const,
        content: attempt === 0
          ? prompt
          : `${prompt}\n\nCRITICAL: Your previous response was not a valid JSON array. Output ONLY the raw JSON array. No markdown. No explanation outside the JSON.`,
      },
    ];

    const response = await fetch(FEATHERLESS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Featherless API error ${response.status}: ${errorText}`);
    }

    // Small model: 2s delay
    await sleep(2000);

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    const parsed = tryParseJSON(content);
    if (Array.isArray(parsed)) {
      // Validate array structure
      const valid = parsed.every(p => p.id && p.analysis && p.remediatedCode && p.explanation);
      if (valid) return parsed as BatchRemediationResult[];
    }
  }

  throw new Error('Failed to parse AI remediation response array after 2 attempts');
}



function buildScanSummaryPrompt(stats: Record<string, unknown>): string {
  return `You are an expert Chief Accessibility Officer. Analyze the following web accessibility scan results and provide an executive summary for stakeholders.

Scan Data:
${JSON.stringify(stats, null, 2)}

Task:
1. Executive Summary: A 2-3 paragraph plain-English overview of the platform's accessibility and performance health.
2. Key Findings: Top 3-5 most critical issues discovered, explained in terms of user impact (not just technical jargon).
3. Recommendations: 3-5 prioritized, actionable steps the engineering team should take to improve the scores.

CRITICAL INSTRUCTION: You must output ONLY raw JSON matching this exact schema. No markdown backticks, no markdown formatting outside the JSON object.
{"executiveSummary": "string", "keyFindings": ["string"], "recommendations": ["string"]}`;
}

export async function generateScanSummary(
  stats: Record<string, unknown>
): Promise<ScanSummaryResult> {
  const apiKey = process.env.FEATHERLESS_API_KEY;
  // Use a balanced model for the final executive report (better intelligence than 1.5B but lower limits than 32B)
  const model = process.env.FEATHERLESS_LARGE_MODEL || 'Qwen/Qwen2.5-7B-Instruct';

  if (!apiKey || apiKey === 'your-key-here') {
    throw new Error('FEATHERLESS_API_KEY not configured');
  }

  const prompt = buildScanSummaryPrompt(stats);

  for (let attempt = 0; attempt < 2; attempt++) {
    const messages = [
      {
        role: 'user' as const,
        content: attempt === 0
          ? prompt
          : `${prompt}\n\nCRITICAL: Your previous response was not valid JSON. Output ONLY the raw JSON object.`,
      },
    ];

    const response = await fetch(FEATHERLESS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1500,
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Featherless API error ${response.status}: ${errorText}`);
    }

    // Large model: 5s delay
    await sleep(5000);

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    const parsed = tryParseJSON(content) as unknown as Record<string, unknown>;
    if (parsed && typeof parsed.executiveSummary === 'string' && Array.isArray(parsed.keyFindings) && Array.isArray(parsed.recommendations)) {
      return parsed as unknown as ScanSummaryResult;
    }
  }

  throw new Error('Failed to parse AI scan summary response after 2 attempts');
}

export interface PageInsightsResult {
  browserIssuesExplanation: string;
  securityExplanation: string;
  performanceExplanation: string;
  axTreeExplanation: string;
}

export async function generatePageInsights(pageData: {
  url: string;
  browserIssues: unknown[];
  securityHeaders: Record<string, unknown> | null;
  performanceMetrics: Record<string, unknown> | null;
  axTreeSnippet: string;
}): Promise<PageInsightsResult> {
  const apiKey = process.env.FEATHERLESS_API_KEY;
  const model = process.env.FEATHERLESS_SMALL_MODEL || 'Qwen/Qwen2.5-0.5B-Instruct';

  if (!apiKey || apiKey === 'your-key-here') {
    throw new Error('FEATHERLESS_API_KEY not configured');
  }

  const prompt = `You are an expert web platform engineer. Analyze the following data collected from an automated scan of ${pageData.url} and provide plain-English explanations a non-technical stakeholder can understand. Do NOT mention "Chrome DevTools" or "CDP" in your response.

1. BROWSER ISSUES (automated browser audit findings):
${JSON.stringify(pageData.browserIssues?.slice(0, 10) || [], null, 2)}

2. SECURITY HEADERS:
${JSON.stringify(pageData.securityHeaders || {}, null, 2)}

3. PERFORMANCE METRICS:
${JSON.stringify(pageData.performanceMetrics || {}, null, 2)}

4. ACCESSIBILITY TREE SNIPPET (how assistive technology parses this page):
${pageData.axTreeSnippet}

For each category, provide a 2-3 sentence explanation of what was found, what it means for users, and what should be improved. If a category has no data, say "No issues detected."

CRITICAL: Output ONLY raw JSON matching this schema:
{"browserIssuesExplanation": "string", "securityExplanation": "string", "performanceExplanation": "string", "axTreeExplanation": "string"}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch(FEATHERLESS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{
          role: 'user' as const,
          content: attempt === 0
            ? prompt
            : `${prompt}\n\nCRITICAL: Output ONLY raw JSON. No markdown.`,
        }],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Featherless API error ${response.status}: ${errorText}`);
    }

    await sleep(2000);

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    const parsed = tryParseJSON(content);
    if (parsed && parsed.browserIssuesExplanation && parsed.securityExplanation) {
      return parsed as PageInsightsResult;
    }
  }

  throw new Error('Failed to parse page insights response after 2 attempts');
}
