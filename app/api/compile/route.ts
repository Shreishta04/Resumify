import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

type CompileResult =
  | { ok: true; pdf: ArrayBuffer }
  | { ok: false; log: string };

// Provider 1: latexonline.cc — GET ?text=<url-encoded source>
async function compileLatexOnline(latex: string): Promise<CompileResult> {
  const url = 'https://latexonline.cc/compile?text=' + encodeURIComponent(latex);
  const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(40000) });
  const ct = res.headers.get('content-type') || '';
  if (res.ok && ct.includes('pdf')) {
    return { ok: true, pdf: await res.arrayBuffer() };
  }
  return { ok: false, log: (await res.text().catch(() => '')).slice(0, 2000) };
}

// Provider 2: texlive.net — multipart POST
async function compileTexLive(latex: string): Promise<CompileResult> {
  const form = new FormData();
  form.append('filename[]', 'document.tex');
  form.append('filecontents[]', latex);
  form.append('engine', 'pdflatex');
  form.append('return', 'pdf');
  const res = await fetch('https://texlive.net/cgi-bin/latexcgi', {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(40000),
  });
  const ct = res.headers.get('content-type') || '';
  if (res.ok && ct.includes('pdf')) {
    return { ok: true, pdf: await res.arrayBuffer() };
  }
  return { ok: false, log: (await res.text().catch(() => '')).slice(0, 2000) };
}

export async function POST(req: NextRequest) {
  try {
    const { latex } = await req.json();

    if (!latex || typeof latex !== 'string') {
      return NextResponse.json({ error: 'No LaTeX provided' }, { status: 400 });
    }

    // texlive.net (POST) is primary — it has no URL-length limit, so it
    // handles full-length resumes. latexonline.cc (GET) is the fallback but
    // 414s on long documents, so it only helps for short ones.
    const providers = [compileTexLive, compileLatexOnline];
    let lastLog = '';

    // Try each provider; within each, retry once on a transient/network error
    for (const provider of providers) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await provider(latex);
          if (result.ok) {
            return new Response(result.pdf, {
              headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="resume.pdf"',
              },
            });
          }
          // Non-PDF response = likely a real LaTeX error; capture and move on
          lastLog = result.log;
          break; // don't retry a clean compile failure on the same provider
        } catch (err) {
          // Network/timeout — retry once, then fall through to next provider
          lastLog = err instanceof Error ? err.message : String(err);
        }
      }
    }

    // Both providers returned a non-PDF response. If the logs look like a real
    // LaTeX error, tell the user that; otherwise treat as a service issue.
    const looksLikeLatexError = /error|undefined control sequence|! /i.test(lastLog);
    if (looksLikeLatexError) {
      return NextResponse.json(
        { error: 'PDF compile failed — your LaTeX has a syntax error. Use "Open in Overleaf" to see the exact line.', log: lastLog },
        { status: 422 }
      );
    }

    return NextResponse.json(
      { error: 'PDF service is temporarily unavailable — please try again in a moment, or use "Open in Overleaf".', log: lastLog },
      { status: 503 }
    );
  } catch (err: unknown) {
    console.error('Compile error:', err);
    return NextResponse.json(
      { error: 'PDF service unavailable — copy LaTeX and compile at overleaf.com' },
      { status: 503 }
    );
  }
}
