import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CONVERSION_SYSTEM_PROMPT } from '@/lib/prompts';

export const maxDuration = 60;

// Retry helper for transient Gemini errors (503 high demand, 429 rate limit)
async function withRetry<T>(fn: () => Promise<T>, retries = 4, baseDelay = 1500): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const status = (err as { status?: number }).status;
      const transient = status === 503 || status === 429 || /503|429|high demand|overloaded|unavailable|rate/i.test(msg);
      if (!transient || i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, baseDelay * (i + 1)));
    }
  }
  throw lastErr;
}

// Free-tier daily quotas differ per model and gemini-2.5-flash is only 20/day.
// Try the highest-quota / most-available models first, falling back on 429/503.
const MODEL_FALLBACKS = [
  'gemini-2.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
];

async function generateWithFallback(prompt: string) {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  let lastErr: unknown;
  for (const modelName of MODEL_FALLBACKS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      return await withRetry(() => model.generateContent(prompt), 2, 1500);
    } catch (err: unknown) {
      lastErr = err;
      const status = (err as { status?: number }).status;
      const msg = err instanceof Error ? err.message : '';
      // Only move to the next model on quota/availability errors
      if (!(status === 429 || status === 503 || /429|503|quota|exceeded|overloaded|unavailable/i.test(msg))) {
        throw err;
      }
    }
  }
  throw lastErr;
}

async function doConvert(text: string): Promise<string> {
  const result = await generateWithFallback(
    `${CONVERSION_SYSTEM_PROMPT}\n\nHere is the resume text to convert:\n\n${text}`
  );

  const responseText = result.response.text();

  // Extract LaTeX
  const latexMatch = responseText.match(/\\documentclass[\s\S]*?\\end\{document\}/);
  if (latexMatch) return latexMatch[0];

  // Strip markdown fences if present
  const fenceStripped = responseText.replace(/^```(?:latex)?\n?/m, '').replace(/\n?```$/m, '').trim();
  if (fenceStripped.includes('\\documentclass')) return fenceStripped;

  return responseText;
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const latex = await doConvert(text);

    if (!latex) {
      return NextResponse.json({ error: 'Conversion returned empty result' }, { status: 500 });
    }

    return NextResponse.json({ latex });
  } catch (err: unknown) {
    console.error('Convert error:', err);
    const msg = err instanceof Error ? err.message : '';
    const status = (err as { status?: number }).status;
    if (status === 429 || /429|rate/i.test(msg)) {
      return NextResponse.json({ error: 'AI is busy — try again in a moment' }, { status: 429 });
    }
    if (status === 503 || /503|high demand|overloaded|unavailable/i.test(msg)) {
      return NextResponse.json({ error: 'AI is busy right now — please try again in a moment' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Conversion failed' }, { status: 500 });
  }
}
