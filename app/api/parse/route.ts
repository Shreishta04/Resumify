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
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(buffer);
      text = data.text;

      // If very little text was extracted, the PDF is likely image-based / scanned
      if (text.trim().length < 50) {
        return NextResponse.json({
          error: 'Your PDF appears to be image-based or scanned — text could not be extracted. Please try one of these:\n1. Export your resume as a .docx from Word/Google Docs\n2. Copy-paste your resume text into a .txt file\n3. Use "Save as PDF" instead of scanning'
        }, { status: 400 });
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
