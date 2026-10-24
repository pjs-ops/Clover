import React, { useState } from 'react';
import { Plus, MessageCircle, Trash2, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import type { Conversation } from '../types';

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenSettings?: () => void;
}

export const Sidebar: React.FC<Props> = ({ conversations, activeId, onNew, onSelect, onDelete, onOpenSettings }) => {
  const [collapsed, setCollapsed] = useState(false);


  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <aside
      style={{
        width: collapsed ? 60 : 260,
        minWidth: collapsed ? 60 : 260,
        height: '100vh',
        backgroundColor: 'var(--soft-mint)',
        borderRight: '1.5px solid var(--border-sage)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.3s ease, min-width 0.3s ease',
        overflow: 'visible',
        position: 'relative',
        zIndex: 20,
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          position: 'absolute',
          top: 20,
          right: -13,
          zIndex: 50,
          width: 26,
          height: 26,
          borderRadius: '50%',
          border: '1.5px solid var(--border-sage)',
          backgroundColor: 'var(--surface-white)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 6px rgba(53,83,66,0.12)',
          color: 'var(--forest-green)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = 'var(--pale-sage)';
          e.currentTarget.style.borderColor = 'var(--leaf-green)';
          e.currentTarget.style.color = 'var(--leaf-green)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'var(--surface-white)';
          e.currentTarget.style.borderColor = 'var(--border-sage)';
          e.currentTarget.style.color = 'var(--forest-green)';
        }}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Brand */}
      <div style={{
        padding: collapsed ? '20px 12px' : '20px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        borderBottom: '1.5px solid var(--border-sage)',
      }}>
        <img
          src="/clover-logo.png"
          alt="Clover"
          style={{
            width: collapsed ? 32 : 40,
            height: collapsed ? 32 : 40,
            borderRadius: 8,
            objectFit: 'contain',
            flexShrink: 0,
            transition: 'all 0.3s',
          }}
        />
        {!collapsed && (
          <div className="animate-fade-in">
            <div style={{ fontWeight: 700, fontSize: '1.15rem', color: 'var(--forest-green)', letterSpacing: '-0.01em' }}>
              Clover
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(53,83,66,0.65)', marginTop: -2 }}>
              Your AI Study Buddy
            </div>
          </div>
        )}
      </div>

      {/* New Chat button */}
      <div style={{ padding: collapsed ? '12px 10px' : '12px 16px' }}>
        <button
          id="new-chat-btn"
          onClick={onNew}
          style={{
            width: '100%',
            padding: collapsed ? '10px' : '10px 14px',
            borderRadius: 12,
            border: '1.5px dashed var(--leaf-green)',
            backgroundColor: 'rgba(253,251,245,0.75)',
            color: 'var(--forest-green)',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: 8,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'var(--surface-white)';
            e.currentTarget.style.color = 'var(--leaf-green)';
            e.currentTarget.style.borderColor = 'var(--leaf-green)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'rgba(253,251,245,0.75)';
            e.currentTarget.style.color = 'var(--forest-green)';
            e.currentTarget.style.borderColor = 'var(--leaf-green)';
          }}
        >
          <Plus size={16} />
          {!collapsed && 'New Chat'}
        </button>
      </div>

      {/* Conversations */}
      {!collapsed && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
          {conversations.length === 0 ? (
            <p style={{ fontSize: '0.78rem', color: 'rgba(53,83,66,0.5)', textAlign: 'center', marginTop: 24 }}>
              No chats yet.<br />Start a new conversation!
            </p>
          ) : (
            <>
              <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'rgba(53,83,66,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Recent
              </p>
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  className="animate-slide-in"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 10px',
                    borderRadius: 10,
                    marginBottom: 4,
                    cursor: 'pointer',
                    backgroundColor: activeId === conv.id ? 'var(--pale-sage)' : 'transparent',
                    transition: 'background-color 0.15s',
                    border: activeId === conv.id ? '1px solid var(--sage)' : '1px solid transparent',
                  }}
                  onMouseEnter={e => {
                    if (activeId !== conv.id) e.currentTarget.style.backgroundColor = 'rgba(255,254,250,0.7)';
                  }}
                  onMouseLeave={e => {
                    if (activeId !== conv.id) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <MessageCircle size={14} style={{ color: activeId === conv.id ? 'var(--leaf-green)' : 'rgba(53,83,66,0.5)', flexShrink: 0 }} />
                  <div
                    style={{ flex: 1, minWidth: 0 }}
                    onClick={() => onSelect(conv.id)}
                  >
                    <div style={{
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      color: 'var(--forest-green)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {conv.title}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'rgba(53,83,66,0.5)', marginTop: 1 }}>
                      {formatDate(conv.updated_at)}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(conv.id); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 2,
                      color: 'rgba(53,83,66,0.4)',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(53,83,66,0.4)')}
                    aria-label="Delete conversation"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Collapsed icons */}
      {collapsed && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '4px 0' }}>
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              title={conv.title}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: activeId === conv.id ? '2px solid var(--leaf-green)' : '2px solid transparent',
                backgroundColor: activeId === conv.id ? 'var(--pale-sage)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: activeId === conv.id ? 'var(--leaf-green)' : 'rgba(53,83,66,0.6)',
                transition: 'all 0.15s',
              }}
            >
              <MessageCircle size={16} />
            </button>
          ))}
        </div>
      )}

      {/* Footer / Settings */}
      {onOpenSettings && (
        <div style={{ padding: collapsed ? '8px 4px' : '12px 14px', borderTop: '1.5px solid var(--border-sage)' }}>
          <button
            id="sidebar-settings-btn"
            onClick={onOpenSettings}
            title="AI Provider Settings"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              gap: 8,
              padding: collapsed ? '8px 0' : '8px 12px',
              borderRadius: 12,
              border: '1.5px solid var(--border-sage)',
              backgroundColor: 'var(--surface-white)',
              color: 'var(--forest-green)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--pale-sage)';
              e.currentTarget.style.borderColor = 'var(--leaf-green)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'var(--surface-white)';
              e.currentTarget.style.borderColor = 'var(--border-sage)';
            }}
          >
            <Settings size={16} color="var(--leaf-green)" />
            {!collapsed && <span>Provider Settings</span>}
          </button>
        </div>
      )}
    </aside>
  );
};

