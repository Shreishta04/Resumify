import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

// Retry helper for transient Gemini errors (503 high demand, 429 rate limit)
async function withRetry<T>(fn: () => Promise<T>, retries = 4, baseDelay = 1500): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const transient = /503|429|high demand|overloaded|unavailable|rate/i.test(msg);
      if (!transient || i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, baseDelay * (i + 1)));
    }
  }
  throw lastErr;
}

// gemini-2.5-flash free tier is only 20 requests/day. Try higher-quota models first.
const MODEL_FALLBACKS = [
  'gemini-2.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
];

async function extractWithGemini(buffer: Buffer): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const base64 = buffer.toString('base64');
  const parts = [
    { inlineData: { mimeType: 'application/pdf', data: base64 } },
    {
      text: 'Extract all the text content from this resume PDF exactly as it appears. Include all sections: name, contact info, summary, education, experience, projects, skills, certifications. Return only the raw extracted text, no formatting or commentary.',
    },
  ];

  let lastErr: unknown;
  for (const modelName of MODEL_FALLBACKS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await withRetry(
        () => model.generateContent({ contents: [{ role: 'user', parts }] }),
        2,
        1500
      );
      return result.response.text();
    } catch (err: unknown) {
      lastErr = err;
      const status = (err as { status?: number }).status;
      const msg = err instanceof Error ? err.message : '';
      if (!(status === 429 || status === 503 || /429|503|quota|exceeded|overloaded|unavailable/i.test(msg))) {
        throw err;
      }
    }
  }
  throw lastErr;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    let text = '';

    if (ext === 'txt') {
      text = await file.text();

    } else if (ext === 'pdf') {
      const buffer = Buffer.from(await file.arrayBuffer());

      // 1) Fast path: standard text extraction (free, instant) for text-based PDFs
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(buffer);
        if (data.text && data.text.trim().length > 50) {
          text = data.text;
        }
      } catch {
        // ignore — fall through to Gemini vision
      }

      // 2) Fallback: Gemini vision (handles scanned / image-based PDFs), with retry
      if (!text || text.trim().length < 50) {
        try {
          text = await extractWithGemini(buffer);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : '';
          if (/503|high demand|overloaded|unavailable/i.test(msg)) {
            return NextResponse.json(
              { error: 'AI is busy right now — please try uploading again in a moment.' },
              { status: 503 }
            );
          }
          if (/429|rate/i.test(msg)) {
            return NextResponse.json(
              { error: 'AI is busy — try again in a moment.' },
              { status: 429 }
            );
          }
          throw err;
        }
      }

    } else if (ext === 'docx') {
      const mammoth = await import('mammoth');
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;

    } else {
      return NextResponse.json({ error: 'Unsupported file format. Use PDF, DOCX, or TXT.' }, { status: 400 });
    }

    if (!text.trim()) {
      return NextResponse.json(
        { error: 'Could not extract text from file — try uploading as .docx or .txt instead' },
        { status: 400 }
      );
    }

    return NextResponse.json({ text });
  } catch (err) {
    console.error('Parse error:', err);
    return NextResponse.json(
      { error: 'Failed to parse file — please try again in a moment.' },
      { status: 500 }
    );
  }
}
