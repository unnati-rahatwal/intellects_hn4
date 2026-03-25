const FEATHERLESS_API_URL = 'https://api.featherless.ai/v1/chat/completions';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface RemediationResult {
  analysis: string;
  remediatedCode: string;
  explanation: string;
}

export interface ScanSummaryResult {
  executiveSummary: string;
  keyFindings: string[];
  recommendations: string[];
}

function buildRemediationPrompt(
  ruleId: string,
  failureSummary: string,
  htmlSnippet: string,
  description: string
): string {
  return `You are an expert Web Accessibility Architect and Frontend Engineer. You are auditing a DOM snippet that failed WCAG rule: ${ruleId}.

Context:
- Violation Summary: ${failureSummary}
- Rule Description: ${description}
- Target DOM Snippet:
\`\`\`html
${htmlSnippet}
\`\`\`

Task:
1. Analysis: Explain in clear, plain language why this specific code fails the WCAG criteria and how it negatively impacts users with disabilities (e.g., screen reader users, keyboard-only users, users with cognitive disabilities).
2. Code Remediation: Provide the corrected HTML code. You MUST preserve all original styling classes, wrapper tags, and non-accessibility related attributes. Only modify what is necessary to fix the accessibility violation. Implement semantic HTML, correct ARIA labels, or contrast-compliant CSS as required.
3. Explanation of Fix: Detail exactly what attributes (e.g., aria-expanded, tabindex, alt, role) were added, modified, or removed, and explain the mechanical reasoning for each change.

CRITICAL INSTRUCTION: You must output ONLY raw JSON matching this exact schema. No markdown backticks, no introductory text, no trailing text. If you output anything other than this exact JSON schema, the system will crash.
{"analysis": "string", "remediatedCode": "string", "explanation": "string"}`;
}

function buildCognitiveAnalysisPrompt(textContent: string): string {
  return `You are an expert in Cognitive Accessibility and plain language communication. Analyze the following webpage text content for cognitive accessibility barriers.

Text Content:
"""
${textContent.slice(0, 4000)}
"""

Evaluate against these criteria:
1. Reading Level: Estimate the Flesch-Kincaid grade level. Flag any paragraphs above 9th-grade reading level.
2. Layout Assessment: Identify long blocks of unbroken text without heading structure.
3. Ambiguous Links: Find any generic, context-free link text like "Click Here", "Read More", "Learn More".
4. Jargon: Identify technical jargon or domain-specific terms that lack explanation.

For each issue found, provide a simplified alternative.

CRITICAL: Output ONLY raw JSON matching this schema:
{"readingLevel": "string grade level estimate", "issues": [{"type": "reading_level|layout|ambiguous_link|jargon", "original": "problematic text", "suggestion": "improved version", "severity": "minor|moderate|serious"}], "overallScore": number 0-100}`;
}

function tryParseJSON(text: string): RemediationResult | null {
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

export async function generateRemediation(
  ruleId: string,
  failureSummary: string,
  htmlSnippet: string,
  description: string
): Promise<RemediationResult> {
  const apiKey = process.env.FEATHERLESS_API_KEY;
  // Use an ultra-small model for high-frequency minor remediations (highest rate limits)
  const model = process.env.FEATHERLESS_SMALL_MODEL || 'Qwen/Qwen2.5-1.5B-Instruct';

  if (!apiKey || apiKey === 'your-key-here') {
    throw new Error('FEATHERLESS_API_KEY not configured');
  }

  const prompt = buildRemediationPrompt(ruleId, failureSummary, htmlSnippet, description);

  for (let attempt = 0; attempt < 2; attempt++) {
    const messages = [
      {
        role: 'user' as const,
        content: attempt === 0
          ? prompt
          : `${prompt}\n\nCRITICAL: Your previous response was not valid JSON. Output ONLY the raw JSON object. No markdown. No explanation outside the JSON.`,
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
        max_tokens: 2000,
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
    if (parsed && parsed.analysis && parsed.remediatedCode && parsed.explanation) {
      return parsed;
    }
  }

  throw new Error('Failed to parse AI remediation response after 2 attempts');
}

export async function analyzeCognitiveLoad(textContent: string): Promise<unknown> {
  const apiKey = process.env.FEATHERLESS_API_KEY;
  const model = process.env.FEATHERLESS_SMALL_MODEL || 'Qwen/Qwen2.5-1.5B-Instruct';

  if (!apiKey || apiKey === 'your-key-here') {
    throw new Error('FEATHERLESS_API_KEY not configured');
  }

  const prompt = buildCognitiveAnalysisPrompt(textContent);

  const response = await fetch(FEATHERLESS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Featherless API error ${response.status}`);
  }

  await sleep(500);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  return tryParseJSON(content) || { error: 'Failed to parse cognitive analysis' };
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
  const model = process.env.FEATHERLESS_LARGE_MODEL || 'meta-llama/Llama-3.1-8B-Instruct';

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
