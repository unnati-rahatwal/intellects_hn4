import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const domElements = body.domElements;

    if (!domElements || !Array.isArray(domElements)) {
      return NextResponse.json({ error: "Invalid DOM payload" }, { status: 400 });
    }

    // Convert DOM elements array into a more compact string to save tokens
    const domString = domElements
      .map((el: any) => `Selector: ${el.selector}\nHTML: ${el.html}`)
      .join("\n\n");

    const FEATHERLESS_API_KEY = process.env.FEATHERLESS_API_KEY;

    if (!FEATHERLESS_API_KEY) {
      return NextResponse.json({ error: "Featherless API key not configured in .env.local" }, { status: 500 });
    }

    // Prompt designed to be robust and return absolute strict JSON 
    const prompt = `
You are an expert strict WCAG 2.2 Accessibility Auditor.
Review the following HTML elements extracted from a webpage.
Identify real accessibility issues such as missing ARIA labels, missing alt text on images, low contrast (if discernible from inline tags), missing labels on inputs, or improper structural roles.
If you don't find issues for an element, skip it. Do not invent issues.

Return your analysis ONLY as a raw JSON object string with no markdown formatting and no conversational text.
Format:
{
  "issues": [
    {
      "selector": "exact CSS selector provided in input",
      "severity": "critical" | "warning",
      "type": "Short Issue Title (e.g. Missing Alt Text)",
      "suggestion": "1-2 sentences on exactly how to fix it"
    }
  ]
}

Input Elements:
${domString}
    `.trim();

    // Call Featherless API
    const response = await fetch("https://api.featherless.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${FEATHERLESS_API_KEY}`
      },
      body: JSON.stringify({
        model: "meta-llama/Meta-Llama-3-8B-Instruct", // common featherless hosted model
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1, // Low temperature for deterministic output
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Featherless API Error:", errorText);
      // Fallback or just throw error (sometimes model name shifts on featherless)
      return NextResponse.json({ error: "Featherless API evaluation failed. Check model or limits." }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    // Robust JSON parsing (handles if model outputs markdown code blocks like ```json ... ```)
    let parsedJson = { issues: [] };
    try {
      const cleaned = content.replace(/```json/g, "").replace(/```/g, "").trim();
      // Find the first { and last }
      const startIdx = cleaned.indexOf("{");
      const endIdx = cleaned.lastIndexOf("}");
      if (startIdx !== -1 && endIdx !== -1) {
        parsedJson = JSON.parse(cleaned.substring(startIdx, endIdx + 1));
      } else {
        parsedJson = JSON.parse(cleaned);
      }
    } catch (e) {
      console.error("Failed to parse JSON from Featherless:", content);
      return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 500 });
    }

    return NextResponse.json({ issues: parsedJson.issues }, { status: 200 });
    
  } catch (error: any) {
    console.error("Analysis API Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred during analysis" },
      { status: 500 }
    );
  }
}
