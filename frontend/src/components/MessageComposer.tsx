import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Lightbulb, BookOpen, HelpCircle } from 'lucide-react';
import { uploadDocument } from '../api';

interface Props {
  onSend: (text: string, shortcut?: 'explain' | 'summarize' | 'quiz', docContent?: string) => void;
  loading: boolean;
  disabled?: boolean;
}

export const MessageComposer: React.FC<Props> = ({ onSend, loading }) => {
  const [text, setText] = useState('');
  const [activeShortcut, setActiveShortcut] = useState<'explain' | 'summarize' | 'quiz' | null>(null);
  const [docContent, setDocContent] = useState<string | null>(null);
  const [docName, setDocName] = useState<string | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [text]);

  const handleSubmit = () => {
    if (!text.trim() || loading) return;
    onSend(text.trim(), activeShortcut ?? undefined, docContent ?? undefined);
    setText('');
    setActiveShortcut(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading) {
        handleSubmit();
      }
    }
  };


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try {
      const result = await uploadDocument(file);
      setDocContent(result.content);
      setDocName(result.filename);
    } catch {
      alert('Failed to upload document.');
    } finally {
      setUploadingDoc(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const shortcuts = [
    { id: 'explain' as const, label: 'Explain Simply', icon: Lightbulb, color: '#F8E8DD', border: '#e8b48a' },
    { id: 'summarize' as const, label: 'Summarize', icon: BookOpen, color: '#E6EFE5', border: '#8ab88a' },
    { id: 'quiz' as const, label: 'Generate Quiz', icon: HelpCircle, color: '#E7EFF9', border: '#8aaae8' },
  ];

  return (
    <div style={{
      padding: '12px 20px 20px',
      backgroundColor: 'var(--cream)',
      borderTop: '1px solid rgba(0,0,0,0.05)',
    }}>
      {/* Shortcut buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {shortcuts.map(s => {
          const Icon = s.icon;
          const active = activeShortcut === s.id;
          return (
            <button
              key={s.id}
              id={`shortcut-${s.id}`}
              onClick={() => setActiveShortcut(active ? null : s.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 20,
                border: `1.5px solid ${active ? s.border : 'rgba(0,0,0,0.1)'}`,
                backgroundColor: active ? s.color : 'rgba(255,255,255,0.7)',
                color: active ? 'var(--dark)' : 'rgba(57,52,67,0.55)',
                fontSize: '0.78rem',
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = s.color; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.7)'; }}
            >
              <Icon size={13} />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Document chip */}
      {docName && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 20,
          backgroundColor: 'var(--lavender)',
          fontSize: '0.78rem',
          color: '#9B7FD4',
          marginBottom: 8,
          fontWeight: 500,
        }}>
          <Paperclip size={12} />
          {docName}
          <button
            onClick={() => { setDocContent(null); setDocName(null); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#9B7FD4', display: 'flex' }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Composer box */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 10,
        backgroundColor: 'white',
        borderRadius: 20,
        border: '1.5px solid rgba(155,127,212,0.25)',
        padding: '10px 14px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        transition: 'border-color 0.2s',
      }}
        onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(155,127,212,0.6)')}
        onBlurCapture={e => (e.currentTarget.style.borderColor = 'rgba(155,127,212,0.25)')}
      >
        {/* File upload */}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.md"
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="file-upload-input"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploadingDoc}
          title="Upload PDF or TXT"
          style={{
            background: 'none',
            border: 'none',
            cursor: uploadingDoc ? 'wait' : 'pointer',
            padding: 4,
            color: 'rgba(57,52,67,0.3)',
            display: 'flex',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#9B7FD4')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(57,52,67,0.3)')}
        >
          <Paperclip size={18} />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          id="message-input"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            activeShortcut === 'explain' ? 'What should I explain simply?'
            : activeShortcut === 'summarize' ? 'What should I summarize?'
            : activeShortcut === 'quiz' ? 'What topic should I quiz you on?'
            : 'Ask Lumi anything...'
          }
          rows={1}
          style={{
            flex: 1,
            resize: 'none',
            border: 'none',
            outline: 'none',
            fontSize: '0.9rem',
            color: 'var(--dark)',
            backgroundColor: 'transparent',
            lineHeight: 1.5,
            fontFamily: 'inherit',
          }}
        />

        {/* Send button */}
        <button
          id="send-btn"
          onClick={handleSubmit}
          disabled={!text.trim() || loading}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            backgroundColor: !text.trim() || loading ? 'rgba(155,127,212,0.25)' : '#9B7FD4',
            color: !text.trim() || loading ? 'rgba(155,127,212,0.5)' : 'white',
            cursor: !text.trim() || loading ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.2s',
            boxShadow: !text.trim() || loading ? 'none' : '0 4px 12px rgba(155,127,212,0.4)',
          }}
          aria-label="Send message"
        >
          {loading ? (
            <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="bounce-dot"
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    backgroundColor: 'rgba(155,127,212,0.7)',
                    display: 'inline-block',
                  }}
                />
              ))}
            </div>
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>

      <p style={{ fontSize: '0.68rem', color: 'rgba(57,52,67,0.3)', textAlign: 'center', marginTop: 8 }}>
        Lumi can make mistakes. Always verify important info. ✨
      </p>
    </div>
  );
};
