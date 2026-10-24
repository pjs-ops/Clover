import axios from 'axios';
import type {
  ChatRequest,
  ChatResponse,
  Conversation,
  SettingsConfig,
  SettingsUpdate,
  SettingsTestRequest,
} from './types';

let inMemorySessionId = '';

export function getSessionId(): string {
  if (!inMemorySessionId) {
    inMemorySessionId = crypto.randomUUID();
  }
  return inMemorySessionId;
}

const api = axios.create({
  baseURL: '/api',
  timeout: 35000, // 35 seconds
});

api.interceptors.request.use(config => {
  config.headers['X-Session-ID'] = getSessionId();
  return config;
});

export function formatApiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.code === 'ECONNABORTED' || err.message?.toLowerCase().includes('timeout')) {
      return '⏱️ Request timed out. Clover took too long to respond. Please try again.';
    }
    if (!err.response) {
      return '🌐 Unable to connect to Clover backend. Please verify that the server is running.';
    }
    const status = err.response.status;
    const detail = err.response.data?.detail;
    if (status === 401) {
      return detail || '🔑 Invalid API key. Check your API key in Settings.';
    }
    if (status === 429) {
      return detail || '⏳ Clover is receiving too many requests right now. Please wait a moment and try again.';
    }
    if (status === 503) {
      return detail || '☁️ Gemini service is temporarily unavailable. Please try again shortly.';
    }
    if (status === 504) {
      return detail || '⏱️ Request timed out waiting for Gemini. Please try again.';
    }
    if (detail && typeof detail === 'string') {
      return detail;
    }
  } else if (err instanceof Error) {
    return err.message;
  }
  return 'Something went wrong. Please try again.';
}

// ── Settings Endpoints ─────────────────────────────────────────────────────────

export async function getSettings(): Promise<SettingsConfig> {
  const res = await api.get<SettingsConfig>('/settings');
  return res.data;
}

export async function updateSettings(req: SettingsUpdate): Promise<SettingsConfig> {
  const res = await api.post<SettingsConfig>('/settings', req);
  return res.data;
}

export async function disconnectSettings(): Promise<void> {
  await api.delete('/settings');
}

export async function testSettingsConnection(
  req: SettingsTestRequest
): Promise<{ status: string; message: string; model?: string }> {
  const res = await api.post<{ status: string; message: string; model?: string }>('/settings/test', req);
  return res.data;
}

// ── Chat Endpoints ────────────────────────────────────────────────────────────

export async function sendMessage(req: ChatRequest): Promise<ChatResponse> {
  const res = await api.post<ChatResponse>('/chat', req);
  return res.data;
}

export async function streamChatMessage(
  req: ChatRequest,
  onChunk: (delta: string) => void,
  onStart?: (meta: { conversation_id: string; title: string }) => void
): Promise<ChatResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s outer safeguard

  try {
    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': getSessionId(),
      },
      body: JSON.stringify(req),
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorDetail = 'Failed to generate response.';
      try {
        const errJson = await response.json();
        errorDetail = errJson.detail || errorDetail;
      } catch {
        errorDetail = response.statusText || errorDetail;
      }
      throw new Error(errorDetail);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported by browser environment.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let currentEvent = 'message';
    let finalResult: ChatResponse | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          currentEvent = 'message';
          continue;
        }

        if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.slice(6).trim();
          continue;
        }

        if (trimmed.startsWith('data:')) {
          const rawData = trimmed.slice(5).trim();
          try {
            const data = JSON.parse(rawData);

            if (currentEvent === 'start') {
              if (onStart) {
                onStart({
                  conversation_id: data.conversation_id,
                  title: data.title,
                });
              }
            } else if (currentEvent === 'chunk') {
              if (data.text) {
                onChunk(data.text);
              }
            } else if (currentEvent === 'done') {
              finalResult = {
                conversation_id: data.conversation_id,
                message: data.message,
                title: data.title,
              };
            } else if (currentEvent === 'error') {
              throw new Error(data.detail || 'An error occurred during response generation.');
            }
          } catch (e) {
            if (e instanceof Error && currentEvent === 'error') {
              throw e;
            }
          }
        }
      }
    }

    if (!finalResult) {
      throw new Error('Connection closed before response completed.');
    }

    return finalResult;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── Conversation & Document Endpoints ─────────────────────────────────────────

export async function getConversations(): Promise<Conversation[]> {
  const res = await api.get<Conversation[]>('/conversations');
  return res.data;
}

export async function getConversation(id: string): Promise<Conversation> {
  const res = await api.get<Conversation>(`/conversations/${id}`);
  return res.data;
}

export async function deleteConversation(id: string): Promise<void> {
  await api.delete(`/conversations/${id}`);
}

export async function uploadDocument(file: File): Promise<{ content: string; filename: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await api.post<{ content: string; filename: string }>('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

