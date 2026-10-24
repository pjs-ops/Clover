import { useState, useCallback } from 'react';
import type { Conversation, Message } from '../types';
import {
  streamChatMessage,
  getConversations,
  getConversation,
  deleteConversation,
  formatApiError,
} from '../api';

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations(data);
    } catch {
      // silent
    }
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    try {
      const conv = await getConversation(id);
      setActiveId(conv.id);
      setMessages(conv.messages);
      setError(null);
    } catch {
      setError('Failed to load conversation.');
    }
  }, []);

  const newChat = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setError(null);
  }, []);

  const send = useCallback(async (
    text: string,
    shortcut?: 'explain' | 'summarize' | 'quiz',
    documentContent?: string
  ) => {
    if (loading || !text.trim()) return;
    setLoading(true);
    setError(null);

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);

    const assistantMsgId = `assistant-${Date.now()}`;
    let hasReceivedChunk = false;

    try {
      const res = await streamChatMessage(
        {
          conversation_id: activeId,
          message: text,
          shortcut,
          document_content: documentContent,
        },
        (chunkText: string) => {
          if (!hasReceivedChunk) {
            hasReceivedChunk = true;
            setMessages(prev => [
              ...prev,
              {
                id: assistantMsgId,
                role: 'assistant',
                content: chunkText,
                timestamp: Date.now(),
              },
            ]);
          } else {
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMsgId ? { ...m, content: m.content + chunkText } : m
              )
            );
          }
        },
        meta => {
          if (meta.conversation_id) {
            setActiveId(meta.conversation_id);
          }
        }
      );

      setActiveId(res.conversation_id);
      setMessages(prev =>
        prev.map(m => (m.id === assistantMsgId ? res.message : m))
      );

      // Update sidebar list
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === res.conversation_id);
        const updated: Conversation = {
          id: res.conversation_id,
          title: res.title,
          created_at: Date.now(),
          updated_at: Date.now(),
          messages: [],
        };
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], title: res.title, updated_at: Date.now() };
          return copy;
        }
        return [updated, ...prev];
      });
    } catch (err: unknown) {
      const msg = formatApiError(err);
      setError(msg);
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== assistantMsgId);
        return [
          ...filtered,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: msg,
            timestamp: Date.now(),
            isError: true,
            retryPayload: {
              message: text,
              shortcut,
              documentContent,
            },
          },
        ];
      });
    } finally {
      setLoading(false);
    }
  }, [activeId, loading]);

  const retryMessage = useCallback(async (errorMsgId: string) => {
    if (loading) return;

    const errMsg = messages.find(m => m.id === errorMsgId);
    if (!errMsg || !errMsg.retryPayload) return;

    const payload = errMsg.retryPayload;

    // Remove the error message from state
    setMessages(prev => prev.filter(m => m.id !== errorMsgId));
    setLoading(true);
    setError(null);

    const assistantMsgId = `assistant-${Date.now()}`;
    let hasReceivedChunk = false;

    try {
      const res = await streamChatMessage(
        {
          conversation_id: activeId,
          message: payload.message,
          shortcut: payload.shortcut,
          document_content: payload.documentContent,
        },
        (chunkText: string) => {
          if (!hasReceivedChunk) {
            hasReceivedChunk = true;
            setMessages(prev => [
              ...prev,
              {
                id: assistantMsgId,
                role: 'assistant',
                content: chunkText,
                timestamp: Date.now(),
              },
            ]);
          } else {
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMsgId ? { ...m, content: m.content + chunkText } : m
              )
            );
          }
        },
        meta => {
          if (meta.conversation_id) {
            setActiveId(meta.conversation_id);
          }
        }
      );

      setActiveId(res.conversation_id);
      setMessages(prev =>
        prev.map(m => (m.id === assistantMsgId ? res.message : m))
      );

      // Update sidebar list
      setConversations(prev => {
        const idx = prev.findIndex(c => c.id === res.conversation_id);
        const updated: Conversation = {
          id: res.conversation_id,
          title: res.title,
          created_at: Date.now(),
          updated_at: Date.now(),
          messages: [],
        };
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], title: res.title, updated_at: Date.now() };
          return copy;
        }
        return [updated, ...prev];
      });
    } catch (err: unknown) {
      const msg = formatApiError(err);
      setError(msg);
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== assistantMsgId);
        return [
          ...filtered,
          {
            id: `err-${Date.now()}`,
            role: 'assistant',
            content: msg,
            timestamp: Date.now(),
            isError: true,
            retryPayload: payload,
          },
        ];
      });
    } finally {
      setLoading(false);
    }
  }, [activeId, loading, messages]);

  const removeConversation = useCallback(async (id: string) => {
    await deleteConversation(id);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeId === id) {
      newChat();
    }
  }, [activeId, newChat]);


  return {
    conversations,
    activeId,
    messages,
    loading,
    error,
    loadConversations,
    loadConversation,
    newChat,
    send,
    retryMessage,
    removeConversation,
  };
}
