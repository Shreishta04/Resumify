import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CONVERSION_SYSTEM_PROMPT } from '@/lib/prompts';

export const maxDuration = 30;

async function doConvert(text: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `${CONVERSION_SYSTEM_PROMPT}\n\nHere is the resume text to convert:\n\n${text}`,
          },
        ],
      },
    ],
  });

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

    let latex: string;
    try {
      latex = await doConvert(text);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 429) {
        // Retry once after a brief wait
        await new Promise((r) => setTimeout(r, 2000));
        latex = await doConvert(text);
      } else {
        throw err;
      }
    }

    if (!latex) {
      return NextResponse.json({ error: 'Conversion returned empty result' }, { status: 500 });
    }

    return NextResponse.json({ latex });
  } catch (err: unknown) {
    console.error('Convert error:', err);
    const status = (err as { status?: number }).status;
    if (status === 429) {
      return NextResponse.json({ error: 'AI is busy — try again in a moment' }, { status: 429 });
    }
    return NextResponse.json({ error: 'Conversion failed' }, { status: 500 });
  }
}
