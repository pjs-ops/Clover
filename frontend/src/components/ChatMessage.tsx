import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AlertCircle, RotateCw } from 'lucide-react';
import type { Message } from '../types';

interface Props {
  message: Message;
  onRetry?: (messageId: string) => void;
  loading?: boolean;
}

export const ChatMessage: React.FC<Props> = ({ message, onRetry, loading }) => {
  const isUser = message.role === 'user';

  return (
    <div
      className="animate-message-in"
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 16,
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      {/* Avatar for assistant */}
      {!isUser && (
        <img
          src="/lumi-logo.png"
          alt="Lumi"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            objectFit: 'cover',
            flexShrink: 0,
            marginTop: 2,
            boxShadow: '0 2px 8px rgba(155,127,212,0.25)',
          }}
        />
      )}

      {/* Bubble */}
      <div
        style={{
          maxWidth: 'min(560px, 78%)',
          padding: '12px 16px',
          borderRadius: isUser ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
          backgroundColor: isUser ? '#9B7FD4' : (message.isError ? '#FEE2E2' : 'white'),
          color: isUser ? 'white' : (message.isError ? '#991B1B' : 'var(--dark)'),
          boxShadow: isUser
            ? '0 4px 16px rgba(155,127,212,0.35)'
            : '0 2px 12px rgba(0,0,0,0.06)',
          border: message.isError ? '1px solid #FECACA' : (isUser ? 'none' : '1px solid rgba(0,0,0,0.04)'),
          fontSize: '0.9rem',
          lineHeight: 1.6,
        }}
      >
        {message.isError && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
              <AlertCircle size={14} />
              Error
            </div>
            {onRetry && (
              <button
                id={`retry-btn-${message.id}`}
                onClick={() => onRetry(message.id)}
                disabled={loading}
                title="Retry this message"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 9px',
                  borderRadius: 12,
                  border: '1px solid #FCA5A5',
                  backgroundColor: 'white',
                  color: '#991B1B',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: loading ? 'default' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  if (!loading) (e.currentTarget.style.backgroundColor = '#FEF2F2');
                }}
                onMouseLeave={e => {
                  if (!loading) (e.currentTarget.style.backgroundColor = 'white');
                }}
              >
                <RotateCw size={12} />
                Retry
              </button>
            )}
          </div>
        )}

        {isUser ? (
          <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
        ) : (
          <div className="prose-lumi">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        <div style={{
          fontSize: '0.65rem',
          marginTop: 6,
          opacity: 0.5,
          textAlign: 'right',
        }}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Avatar for user */}
      {isUser && (
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: 'var(--peach)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.8rem',
          fontWeight: 700,
          color: '#c0785e',
          marginTop: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
          U
        </div>
      )}
    </div>
  );
};
