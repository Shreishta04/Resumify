'use client';

import { useEffect, useRef, useState } from 'react';
import { latexToHtml } from '@/lib/latex-to-html';

const RESUME_WIDTH = 640;

interface PreviewPaneProps {
  latex: string;
}

export default function PreviewPane({ latex }: PreviewPaneProps) {
  const [html, setHtml] = useState('');
  const [visible, setVisible] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scale resume to fit the pane width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      const available = el.clientWidth - 32; // 16px padding each side
      setScale(available < RESUME_WIDTH ? available / RESUME_WIDTH : 1);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    setVisible(false);
    const timer = setTimeout(() => {
      try {
        const result = latexToHtml(latex);
        setHtml(result);
        setHasError(result.includes('preview-error'));
      } catch {
        setHasError(true);
        setHtml('<div class="preview-error">Preview unavailable</div>');
      }
      setVisible(true);
    }, 150);
    return () => clearTimeout(timer);
  }, [latex]);

  return (
    <div style={{
      flex: '0 0 50%',
      width: '50%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      borderLeft: `3px solid ${hasError ? 'var(--warning)' : 'var(--success)'}`,
      overflow: 'hidden',
    }}>
      {/* Pane header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 14px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Preview</span>
        <span style={{ fontSize: '11px', color: hasError ? 'var(--warning)' : 'var(--text-muted)' }}>
          {hasError ? 'Preview may be incomplete' : 'Auto-updates as you type'}
        </span>
      </div>

      {/* Scrollable preview */}
      <div ref={containerRef} style={{ flex: 1, overflow: 'auto', padding: '24px 16px', display: 'flex', justifyContent: 'center', minHeight: 0 }}>
        {/* Outer wrapper — takes up correct scaled height so scroll works */}
        <div style={{
          width: `${RESUME_WIDTH * scale}px`,
          minHeight: `${900 * scale}px`,
          alignSelf: 'flex-start',
          flexShrink: 0,
        }}>
          {/* Inner resume at natural width, scaled down */}
          <div
            style={{
              background: '#fff',
              width: `${RESUME_WIDTH}px`,
              minHeight: '900px',
              boxShadow: '0 4px 40px rgba(0,0,0,0.5)',
              borderRadius: '2px',
              opacity: visible ? 1 : 0,
              transition: 'opacity 150ms ease',
              transformOrigin: 'top left',
              transform: `scale(${scale})`,
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}
