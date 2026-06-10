import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { latex } = await req.json();

    if (!latex) {
      return NextResponse.json({ error: 'No LaTeX provided' }, { status: 400 });
    }

    // Use latexonline.cc to compile
    const formData = new FormData();
    formData.append('filecontents[]', new Blob([latex], { type: 'text/plain' }), 'resume.tex');
    formData.append('filename[]', 'resume.tex');

    const response = await fetch('https://latexonline.cc/compile', {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      console.error('LaTeX compile error:', errText);
      return NextResponse.json(
        { error: 'PDF compile failed — check your LaTeX for syntax errors', log: errText },
        { status: 422 }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('pdf')) {
      const body = await response.text().catch(() => '');
      return NextResponse.json(
        { error: 'PDF service returned unexpected response', log: body },
        { status: 422 }
      );
    }

    const pdfBuffer = await response.arrayBuffer();

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="resume.pdf"',
      },
    });
  } catch (err: unknown) {
    console.error('Compile error:', err);
    const message = err instanceof Error ? err.message : '';
    if (message.includes('timeout') || message.includes('abort')) {
      return NextResponse.json({ error: 'PDF service unavailable — copy LaTeX and compile at overleaf.com' }, { status: 503 });
    }
    return NextResponse.json({ error: 'PDF service unavailable — copy LaTeX and compile at overleaf.com' }, { status: 503 });
  }
}
