'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatPanelProps {
  latex: string;
  onLatexUpdate: (latex: string) => void;
  onError: (msg: string) => void;
}

const PLACEHOLDERS = [
  'Make my bullets more action-oriented',
  'Add a skills section',
  'Move education above experience',
  'Shorten the work experience section',
  'Add more quantifiable achievements',
];

export default function ChatPanel({ latex, onLatexUpdate, onError }: ChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [placeholder] = useState(PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const sendMessage = async () => {
    if (!input.trim() || thinking) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setThinking(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latex, message: userMsg }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Chat failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let full = '';
      setThinking(false);
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Updating your resume…' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        // Don't dump raw LaTeX into the chat — keep a clean status while streaming
      }

      // Extract LaTeX from the response (strip any markdown fences first)
      const cleaned = full.replace(/```(?:latex)?/gi, '');
      const latexMatch = cleaned.match(/\\documentclass[\s\S]*?\\end\{document\}/);
      if (latexMatch) {
        onLatexUpdate(latexMatch[0]);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: 'Done! I\'ve applied your changes to the resume. ✦' };
          return updated;
        });
      } else if (cleaned.includes('\\documentclass')) {
        // Got a documentclass but no closing — likely truncated. Apply what we have.
        onLatexUpdate(cleaned.slice(cleaned.indexOf('\\documentclass')).trim());
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: 'Applied your changes (response may have been long — double-check the result).' };
          return updated;
        });
      } else {
        // No LaTeX detected — show the model's reply as-is
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: 'assistant',
            content: full.trim() || 'I couldn\'t generate an update. Try rephrasing your request.',
          };
          return updated;
        });
      }
    } catch (err) {
      setThinking(false);
      // Remove the empty assistant placeholder if present
      setMessages((prev) => {
        const updated = [...prev];
        if (updated.length && updated[updated.length - 1].role === 'assistant' && !updated[updated.length - 1].content) {
          updated.pop();
        }
        return updated;
      });
      onError(err instanceof Error ? err.message : 'Chat failed');
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'var(--accent)',
          color: '#fff',
          border: 'none',
          borderRadius: '24px',
          padding: '10px 18px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          display: open ? 'none' : 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 4px 20px var(--accent-glow)',
          zIndex: 100,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <Sparkles size={14} />
        Chat with AI
      </button>

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '380px',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 200,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 200ms ease-out',
          boxShadow: open ? '-4px 0 30px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="var(--accent)" />
            <span style={{ fontWeight: 600, fontSize: '15px' }}>AI Resume Editor</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.length === 0 && (
            <div style={{
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '13px',
              marginTop: '40px',
              lineHeight: '1.6',
              padding: '0 16px',
            }}>
              <Sparkles size={24} color="var(--accent)" style={{ margin: '0 auto 12px' }} />
              <p>Tell me what to change about your resume.</p>
              <p style={{ marginTop: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                I&apos;ll edit the LaTeX directly.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                gap: '8px',
                alignItems: 'flex-start',
              }}
            >
              {msg.role === 'assistant' && (
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: 'var(--accent-glow)', border: '1px solid var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Sparkles size={10} color="var(--accent)" />
                </div>
              )}
              <div style={{
                maxWidth: '80%',
                background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface-elevated)',
                borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                padding: '10px 12px',
                fontSize: '13px',
                lineHeight: '1.5',
                color: 'var(--text-primary)',
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {thinking && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: 'var(--accent-glow)', border: '1px solid var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={10} color="var(--accent)" />
              </div>
              <div style={{
                background: 'var(--surface-elevated)',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                gap: '4px',
                alignItems: 'center',
              }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: 'var(--text-muted)',
                      animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
                <style>{`
                  @keyframes bounce {
                    0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
                    40% { transform: scale(1); opacity: 1; }
                  }
                `}</style>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '12px',
          borderTop: '1px solid var(--border)',
          flexShrink: 0,
          display: 'flex',
          gap: '8px',
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={placeholder}
            disabled={thinking}
            style={{
              flex: 1,
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
              fontFamily: 'Inter, sans-serif',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || thinking}
            style={{
              background: 'var(--accent)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              opacity: (!input.trim() || thinking) ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Send size={16} color="#fff" />
          </button>
        </div>
      </div>
    </>
  );
}
