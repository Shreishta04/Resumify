'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, ExternalLink, Download, Check, Loader2 } from 'lucide-react';

interface ToolbarProps {
  latex: string;
  onError: (msg: string) => void;
  onSuccess: (msg: string) => void;
}

export default function Toolbar({ latex, onError, onSuccess }: ToolbarProps) {
  const [copied, setCopied] = useState(false);
  const [compiling, setCompiling] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(latex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onError('Failed to copy to clipboard');
    }
  };

  const handleOverleaf = () => {
    const encoded = encodeURIComponent(latex);
    window.open(`https://www.overleaf.com/docs?snip=${encoded}`, '_blank');
  };

  const handleDownload = async () => {
    setCompiling(true);
    try {
      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latex }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Compile failed');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume.pdf';
      a.click();
      URL.revokeObjectURL(url);
      onSuccess('Resume downloaded!');
    } catch (err) {
      onError(err instanceof Error ? err.message : 'PDF download failed');
    } finally {
      setCompiling(false);
    }
  };

  const btnStyle = (accent?: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    border: accent ? 'none' : '1px solid var(--border)',
    background: accent ? 'var(--accent)' : 'var(--surface-elevated)',
    color: 'var(--text-primary)',
    fontFamily: 'Inter, sans-serif',
    transition: 'all 200ms ease',
  });

  return (
    <div style={{
      height: '48px',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      flexShrink: 0,
    }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px', textDecoration: 'none' }}>
        <ArrowLeft size={14} />
        New resume
      </Link>

      <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '16px', letterSpacing: '-0.5px' }}>
        Resumify
      </span>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button onClick={handleCopy} style={btnStyle()}>
          {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
          {copied ? 'Copied!' : 'Copy LaTeX'}
        </button>
        <button onClick={handleOverleaf} style={btnStyle()}>
          <ExternalLink size={14} />
          Open in Overleaf
        </button>
        <button onClick={handleDownload} disabled={compiling} style={{ ...btnStyle(true), opacity: compiling ? 0.7 : 1 }}>
          {compiling ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Download size={14} />}
          {compiling ? 'Compiling...' : 'Download PDF'}
        </button>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
