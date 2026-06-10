import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { latex } = await req.json();

    if (!latex) {
      return NextResponse.json({ error: 'No LaTeX provided' }, { status: 400 });
    }

    // latexonline.cc compiles a single .tex file via GET ?text=<url-encoded source>
    const url = 'https://latexonline.cc/compile?text=' + encodeURIComponent(latex);

    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(45000),
    });

    const contentType = response.headers.get('content-type') || '';

    if (!response.ok || !contentType.includes('pdf')) {
      const log = await response.text().catch(() => '');
      console.error('LaTeX compile error:', log.slice(0, 1000));
      return NextResponse.json(
        { error: 'PDF compile failed — check your LaTeX for syntax errors', log: log.slice(0, 2000) },
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
    return NextResponse.json(
      { error: 'PDF service unavailable — copy LaTeX and compile at overleaf.com' },
      { status: 503 }
    );
  }
}
