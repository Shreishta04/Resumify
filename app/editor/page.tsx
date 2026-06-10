'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Toolbar from '@/components/Toolbar';
import PreviewPane from '@/components/PreviewPane';
import { ToastContainer, useToast } from '@/components/Toast';
import { SAMPLE_LATEX } from '@/lib/jake-template';

const EditorPane = dynamic(() => import('@/components/EditorPane'), { ssr: false });
const ChatPanel = dynamic(() => import('@/components/ChatPanel'), { ssr: false });

export default function EditorPage() {
  const [latex, setLatex] = useState('');
  const [loaded, setLoaded] = useState(false);
  const { toasts, addToast, dismiss } = useToast();

  useEffect(() => {
    const stored = sessionStorage.getItem('resumify_latex');
    if (stored) {
      setLatex(stored);
    } else {
      setLatex(SAMPLE_LATEX);
    }
    setLoaded(true);
  }, []);

  const handleLatexChange = (val: string) => {
    setLatex(val);
    sessionStorage.setItem('resumify_latex', val);
  };

  if (!loaded) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        color: 'var(--text-secondary)',
        fontSize: '14px',
      }}>
        Loading editor...
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>
      <Toolbar
        latex={latex}
        onError={(msg) => addToast(msg, 'error')}
        onSuccess={(msg) => addToast(msg, 'success')}
      />

      {/* Split pane */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        minHeight: 0,
      }}>
        <EditorPane latex={latex} onChange={handleLatexChange} />
        <PreviewPane latex={latex} />
      </div>

      <ChatPanel
        latex={latex}
        onLatexUpdate={handleLatexChange}
        onError={(msg) => addToast(msg, 'error')}
      />

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
