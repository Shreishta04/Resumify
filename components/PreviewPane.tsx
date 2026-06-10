'use client';

import { useEffect, useState } from 'react';
import { latexToHtml } from '@/lib/latex-to-html';

interface PreviewPaneProps {
  latex: string;
}

export default function PreviewPane({ latex }: PreviewPaneProps) {
  const [html, setHtml] = useState('');
  const [visible, setVisible] = useState(true);
  const [hasError, setHasError] = useState(false);

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
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 16px', display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            background: '#fff',
            width: '100%',
            maxWidth: '680px',
            minHeight: '900px',
            boxShadow: '0 4px 40px rgba(0,0,0,0.5)',
            borderRadius: '2px',
            opacity: visible ? 1 : 0,
            transition: 'opacity 150ms ease',
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
