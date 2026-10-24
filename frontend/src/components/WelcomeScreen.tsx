import React from 'react';
import { Sparkles, BookOpen, Brain, MessageCircle, Lightbulb, HelpCircle } from 'lucide-react';

interface Props {
  onSuggestion: (text: string, shortcut?: 'explain' | 'summarize' | 'quiz') => void;
}

const suggestions = [
  { icon: Lightbulb, text: 'Explain quantum entanglement simply', shortcut: 'explain' as const, bg: '#E7F0D5', border: '#A8C686', iconColor: '#355342' },
  { icon: BookOpen, text: 'Summarize the French Revolution', shortcut: 'summarize' as const, bg: '#F1F3E5', border: '#DFE7D7', iconColor: '#638653' },
  { icon: HelpCircle, text: 'Quiz me on Python basics', shortcut: 'quiz' as const, bg: '#FFFEFA', border: '#A8C686', iconColor: '#355342' },
  { icon: Brain, text: 'How does the human brain form memories?', shortcut: undefined, bg: '#E7F0D5', border: '#A8C686', iconColor: '#638653' },
  { icon: MessageCircle, text: 'Help me write an essay introduction', shortcut: undefined, bg: '#F1F3E5', border: '#DFE7D7', iconColor: '#355342' },
  { icon: Sparkles, text: 'Give me 5 creative story ideas', shortcut: undefined, bg: '#FFFEFA', border: '#DFE7D7', iconColor: '#638653' },
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
        src="/clover-logo.png"
        alt="Clover"
        className="animate-float"
        style={{ width: 140, height: 140, objectFit: 'contain', marginBottom: 16 }}
      />

      <h1 style={{ fontSize: '1.9rem', fontWeight: 700, color: 'var(--forest-green)', margin: 0, textAlign: 'center' }}>
        Hi, I'm <span style={{ color: 'var(--leaf-green)' }}>Clover</span> 🍀
      </h1>
      <p style={{ color: 'rgba(53,83,66,0.65)', marginTop: 8, textAlign: 'center', fontSize: '1rem', maxWidth: 400 }}>
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
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(53,83,66,0.08)';
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
              <span style={{ fontSize: '0.82rem', color: 'var(--forest-green)', fontWeight: 500, lineHeight: 1.4 }}>
                {s.text}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
