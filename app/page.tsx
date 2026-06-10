'use client';

import { useRouter } from 'next/navigation';
import { FileText, Zap, MessageSquare } from 'lucide-react';
import UploadZone from '@/components/UploadZone';
import { ToastContainer, useToast } from '@/components/Toast';
import { SAMPLE_LATEX } from '@/lib/jake-template';

export default function Home() {
  const router = useRouter();
  const { toasts, addToast, dismiss } = useToast();

  const handleLatexReady = (latex: string) => {
    sessionStorage.setItem('resumify_latex', latex);
    router.push('/editor');
  };

  const handleSample = () => {
    sessionStorage.setItem('resumify_latex', SAMPLE_LATEX);
    router.push('/editor');
  };

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      gap: '32px',
    }}>
      {/* Badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 14px',
        borderRadius: '20px',
        border: '1px solid var(--border)',
        background: 'var(--accent-glow)',
        color: 'var(--accent)',
        fontSize: '12px',
        fontWeight: 500,
        letterSpacing: '0.3px',
      }}>
        ✦ Free · No login · Open source AI
      </div>

      {/* Headline */}
      <div style={{ textAlign: 'center', maxWidth: '600px' }}>
        <h1 style={{
          fontSize: 'clamp(36px, 6vw, 56px)',
          fontWeight: 700,
          lineHeight: 1.1,
          letterSpacing: '-1.5px',
          marginBottom: '16px',
        }}>
          Your resume,{' '}
          <span style={{ color: 'var(--accent)' }}>Jake&apos;s format.</span>
        </h1>
        <p style={{
          fontSize: '18px',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
          maxWidth: '520px',
          margin: '0 auto',
        }}>
          Upload your resume in any format. AI converts it to the cleanest LaTeX resume template on the internet. Edit, chat, download.
        </p>
      </div>

      {/* Upload zone */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', width: '100%', maxWidth: '480px' }}>
        <UploadZone onLatexReady={handleLatexReady} onError={(msg) => addToast(msg, 'error')} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            Supports PDF, DOCX, and .txt · Powered by Gemini 2.5 Flash + Groq
          </p>
          <button
            onClick={handleSample}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              fontSize: '13px',
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Try with a sample →
          </button>
        </div>
      </div>

      {/* Feature cards */}
      <div style={{
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: '600px',
      }}>
        {[
          { icon: <Zap size={18} color="var(--accent)" />, title: 'AI Conversion', desc: 'Gemini 2.5 Flash maps your content to Jake\'s template perfectly' },
          { icon: <FileText size={18} color="var(--accent)" />, title: 'Live Preview', desc: 'See your resume update as you edit in real time' },
          { icon: <MessageSquare size={18} color="var(--accent)" />, title: 'Chat Editing', desc: 'Ask AI to refine, reorder, and improve your resume with plain English' },
        ].map((f) => (
          <div
            key={f.title}
            style={{
              flex: '1 1 160px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {f.icon}
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{f.title}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center' }}>
        Built with Next.js · No data stored · Resumes deleted after session
      </p>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </main>
  );
}
