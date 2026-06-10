import { NextRequest, NextResponse } from 'next/server';

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

      // First try standard text extraction (fast, free)
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(buffer);
        if (data.text && data.text.trim().length > 50) {
          text = data.text;
        }
      } catch {
        // pdf-parse failed, will fall through to Gemini
      }

      // If text extraction got little/nothing, use Gemini vision (handles scanned/image PDFs)
      if (!text || text.trim().length < 50) {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const base64 = buffer.toString('base64');
        const result = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'application/pdf',
                  data: base64,
                }
              },
              {
                text: 'Extract all the text content from this resume PDF exactly as it appears. Include all sections: name, contact info, education, experience, projects, skills. Return only the raw extracted text, no formatting or commentary.'
              }
            ]
          }]
        });

        text = result.response.text();
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
      return NextResponse.json({ error: 'Could not extract text from file — try uploading as .docx or .txt instead' }, { status: 400 });
    }

    return NextResponse.json({ text });
  } catch (err) {
    console.error('Parse error:', err);
    return NextResponse.json({ error: 'Failed to parse file — try uploading as .docx or .txt instead' }, { status: 500 });
  }
}
