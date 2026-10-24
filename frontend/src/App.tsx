import React, { useState, useEffect } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { TranslationView } from './components/TranslationView';
import { SettingsModal } from './components/SettingsModal';
import { useChat } from './hooks/useChat';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'translate' | 'chat'>('translate');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const {
    conversations,
    activeId,
    messages,
    loading,
    loadConversations,
    loadConversation,
    newChat,
    send,
    retryMessage,
    removeConversation,
  } = useChat();

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  return (
    <>
      <SplashScreen />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <div style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--cream)',
        fontFamily: "'Inter', sans-serif",
      }}>
        <Sidebar
          conversations={conversations}
          activeId={activeId}
          activeView={activeView}
          onViewChange={setActiveView}
          onNew={newChat}
          onSelect={loadConversation}
          onDelete={removeConversation}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
        {activeView === 'translate' ? (
          <TranslationView />
        ) : (
          <ChatArea
            messages={messages}
            loading={loading}
            onSend={send}
            onRetry={retryMessage}
          />
        )}
      </div>
    </>
  );
};

export default App;

