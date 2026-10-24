import React from 'react';
import { useSplash } from '../hooks/useSplash';

const Sparkle: React.FC<{ style: React.CSSProperties }> = ({ style }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className="animate-sparkle"
    style={{ width: 16, height: 16, position: 'absolute', color: 'var(--leaf-green)', ...style }}
  >
    <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />
  </svg>
);

export const SplashScreen: React.FC = () => {
  const { visible, fading } = useSplash();

  if (!visible) return null;

  return (
    <div
      className={fading ? 'animate-fade-out' : ''}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'var(--cream)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
      }}
    >
      {/* Logo container with glow */}
      <div
        className="animate-pulse-glow"
        style={{ position: 'relative', width: 160, height: 160 }}
      >
        <img
          src="/clover-logo.png"
          alt="Clover"
          className="animate-float"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
        {/* Sparkles */}
        <Sparkle style={{ top: -8, right: 10, animationDelay: '0s' }} />
        <Sparkle style={{ top: 20, left: -12, animationDelay: '0.5s', width: 12, height: 12 }} />
        <Sparkle style={{ bottom: 10, right: -8, animationDelay: '1s', width: 10, height: 10 }} />
        <Sparkle style={{ bottom: -4, left: 20, animationDelay: '1.5s' }} />
      </div>

      {/* Text */}
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontSize: '1.05rem',
          color: 'var(--forest-green)',
          letterSpacing: '0.02em',
          fontStyle: 'italic',
        }}>
          Growing your AI study space... 🍀
        </p>
      </div>

      {/* Loading bar */}
      <div style={{
        width: 200,
        height: 4,
        backgroundColor: 'var(--soft-mint)',
        borderRadius: 9999,
        overflow: 'hidden',
      }}>
        <div
          className="animate-loading-bar"
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #A8C686, #638653)',
            borderRadius: 9999,
          }}
        />
      </div>
    </div>
  );
};
