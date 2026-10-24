import React from 'react';
import { Sparkles, BookOpen, Brain, MessageCircle, Lightbulb, HelpCircle } from 'lucide-react';

interface Props {
  onSuggestion: (text: string, shortcut?: 'explain' | 'summarize' | 'quiz') => void;
}

const suggestions = [
  { icon: Lightbulb, text: 'Explain quantum entanglement simply', shortcut: 'explain' as const, bg: '#F8E8DD', border: '#e8b48a', iconColor: '#c0785e' },
  { icon: BookOpen, text: 'Summarize the French Revolution', shortcut: 'summarize' as const, bg: '#E6EFE5', border: '#8ab88a', iconColor: '#5a8a5a' },
  { icon: HelpCircle, text: 'Quiz me on Python basics', shortcut: 'quiz' as const, bg: '#E7EFF9', border: '#8aaae8', iconColor: '#5a75b8' },
  { icon: Brain, text: 'How does the human brain form memories?', shortcut: undefined, bg: '#EDE5F7', border: '#c9b8e8', iconColor: '#9B7FD4' },
  { icon: MessageCircle, text: 'Help me write an essay introduction', shortcut: undefined, bg: '#F8E8DD', border: '#e8b48a', iconColor: '#c0785e' },
  { icon: Sparkles, text: 'Give me 5 creative story ideas', shortcut: undefined, bg: '#E6EFE5', border: '#8ab88a', iconColor: '#5a8a5a' },
];

export const WelcomeScreen: React.FC<Props> = ({ onSuggestion }) => {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      maxWidth: 700,
      margin: '0 auto',
      width: '100%',
    }}>
      {/* Logo */}
      <img
        src="/lumi-logo.png"
        alt="Lumi"
        className="animate-float"
        style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', marginBottom: 20 }}
      />

      <h1 style={{ fontSize: '1.9rem', fontWeight: 700, color: 'var(--dark)', margin: 0, textAlign: 'center' }}>
        Hi, I'm <span style={{ color: '#9B7FD4' }}>Lumi</span> ✨
      </h1>
      <p style={{ color: 'rgba(57,52,67,0.55)', marginTop: 8, textAlign: 'center', fontSize: '1rem', maxWidth: 380 }}>
        Your AI-powered study buddy. Ask me anything — I'm here to help you learn, explore, and understand.
      </p>

      {/* Suggestion cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
        marginTop: 32,
        width: '100%',
      }}>
        {suggestions.map((s, i) => {
          const Icon = s.icon;
          return (
            <button
              key={i}
              id={`suggestion-${i}`}
              onClick={() => onSuggestion(s.text, s.shortcut)}
              style={{
                textAlign: 'left',
                padding: '14px 16px',
                borderRadius: 16,
                border: `1.5px solid ${s.border}`,
                backgroundColor: s.bg,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: 'rgba(255,255,255,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={16} color={s.iconColor} />
              </div>
              <span style={{ fontSize: '0.82rem', color: 'var(--dark)', fontWeight: 500, lineHeight: 1.4 }}>
                {s.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
