'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, CheckCircle } from 'lucide-react';

const LOADING_MESSAGES = [
  'Extracting your content...',
  'Converting to LaTeX...',
  'Applying Jake\'s template...',
  'Almost ready...',
];

interface UploadZoneProps {
  onLatexReady: (latex: string) => void;
  onError: (msg: string) => void;
}

export default function UploadZone({ onLatexReady, onError }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startLoadingCycle = () => {
    setLoadingStep(0);
    let step = 0;
    intervalRef.current = setInterval(() => {
      step = (step + 1) % LOADING_MESSAGES.length;
      setLoadingStep(step);
    }, 1800);
  };

  const stopLoadingCycle = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const processFile = useCallback(async (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'txt'].includes(ext || '')) {
      onError('Unsupported file format. Use PDF, DOCX, or TXT.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      onError('File too large (max 5MB)');
      return;
    }

    setFile(f);
    setLoading(true);
    setDone(false);
    startLoadingCycle();

    try {
      // Step 1: Parse
      const form = new FormData();
      form.append('file', f);
      const parseRes = await fetch('/api/parse', { method: 'POST', body: form });
      const parseData = await parseRes.json();
      if (!parseRes.ok) throw new Error(parseData.error || 'Parse failed');

      // Step 2: Convert
      const convertRes = await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: parseData.text }),
      });
      const convertData = await convertRes.json();
      if (!convertRes.ok) throw new Error(convertData.error || 'Conversion failed');

      stopLoadingCycle();
      setLoading(false);
      setDone(true);

      setTimeout(() => onLatexReady(convertData.latex), 600);
    } catch (err) {
      stopLoadingCycle();
      setLoading(false);
      setDone(false);
      onError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }, [onLatexReady, onError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, [processFile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  return (
    <div
      onClick={() => !loading && inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      style={{
        width: '100%',
        maxWidth: '480px',
        height: '220px',
        border: `2px dashed ${isDragging ? 'var(--accent)' : done ? 'var(--success)' : 'var(--border)'}`,
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        cursor: loading ? 'default' : 'pointer',
        background: isDragging ? 'var(--accent-glow)' : 'var(--surface)',
        transition: 'border-color 200ms ease, background 200ms ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        onChange={handleChange}
        style={{ display: 'none' }}
      />

      {loading ? (
        <>
          <div style={{ position: 'relative', width: '40px', height: '40px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              border: '3px solid var(--border)',
              borderTopColor: 'var(--accent)',
              animation: 'spin 0.8s linear infinite',
            }} />
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '0 20px' }}>
            {LOADING_MESSAGES[loadingStep]}
          </p>
        </>
      ) : done ? (
        <>
          <CheckCircle size={36} color="var(--success)" />
          <p style={{ color: 'var(--success)', fontSize: '14px', fontWeight: 500 }}>
            {file?.name}
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Redirecting to editor...</p>
        </>
      ) : (
        <>
          <Upload size={36} color="var(--accent)" />
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 500 }}>
              {file ? file.name : 'Drop your resume here'}
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
              or click to browse
            </p>
          </div>
        </>
      )}
    </div>
  );
}
