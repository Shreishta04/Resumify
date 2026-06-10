'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface EditorPaneProps {
  latex: string;
  onChange: (value: string) => void;
}

export default function EditorPane({ latex, onChange }: EditorPaneProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (value: string | undefined) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange(value || '');
    }, 400);
  };

  return (
    <div style={{
      flex: '0 0 50%',
      width: '50%',
      display: 'flex',
      flexDirection: 'column',
      borderLeft: '3px solid var(--accent)',
      overflow: 'hidden',
    }}>
      {/* Pane header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 14px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>LaTeX source</span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Jake&apos;s Resume Template</span>
      </div>

      {/* Monaco Editor */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <MonacoEditor
          height="100%"
          language="latex"
          value={latex}
          onChange={handleChange}
          theme="vs-dark"
          options={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 13,
            lineNumbers: 'on',
            minimap: { enabled: false },
            wordWrap: 'off',
            scrollBeyondLastLine: false,
            renderLineHighlight: 'line',
            padding: { top: 12 },
            smoothScrolling: true,
            cursorSmoothCaretAnimation: 'on',
          }}
          beforeMount={(monaco) => {
            monaco.editor.defineTheme('resumify-dark', {
              base: 'vs-dark',
              inherit: true,
              rules: [],
              colors: {
                'editor.background': '#1A1A1A',
                'editor.lineHighlightBackground': '#242424',
                'editorLineNumber.foreground': '#5A5A5A',
                'editorLineNumber.activeForeground': '#9A9A9A',
              },
            });
          }}
          onMount={(editor, monaco) => {
            monaco.editor.setTheme('resumify-dark');
            editor.focus();
          }}
        />
      </div>
    </div>
  );
}
