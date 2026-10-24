import React, { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { WelcomeScreen } from './WelcomeScreen';
import { MessageComposer } from './MessageComposer';
import type { Message } from '../types';

interface Props {
  messages: Message[];
  loading: boolean;
  onSend: (text: string, shortcut?: 'explain' | 'summarize' | 'quiz', docContent?: string) => void;
  onRetry?: (messageId: string) => void;
}

const TypingIndicator: React.FC = () => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
    <img
      src="/lumi-logo.png"
      alt="Lumi"
      style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', marginTop: 2 }}
    />
    <div style={{
      padding: '12px 16px',
      borderRadius: '20px 20px 20px 6px',
      backgroundColor: 'white',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      border: '1px solid rgba(0,0,0,0.04)',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    }}>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="bounce-dot"
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#C9B8E8',
            display: 'inline-block',
          }}
        />
      ))}
    </div>
  </div>
);

export const ChatArea: React.FC<Props> = ({ messages, loading, onSend, onRetry }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const hasMessages = messages.length > 0;

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: 'var(--cream)',
    }}>
      {/* Messages / Welcome */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {!hasMessages ? (
          <WelcomeScreen onSuggestion={onSend} />
        ) : (
          <div style={{ maxWidth: 720, width: '100%', margin: '0 auto', padding: '24px 24px 8px' }}>
            {messages.map(msg => (
              <ChatMessage key={msg.id} message={msg} onRetry={onRetry} loading={loading} />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}

      </div>

      {/* Composer always at bottom */}
      <div style={{ maxWidth: 720, width: '100%', margin: '0 auto', alignSelf: 'stretch' }}>
        <MessageComposer onSend={onSend} loading={loading} />
      </div>
    </div>
  );
};
