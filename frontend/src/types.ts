export interface RetryPayload {
  message: string;
  shortcut?: 'explain' | 'summarize' | 'quiz';
  documentContent?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isError?: boolean;
  retryPayload?: RetryPayload;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  messages: Message[];
}

export interface ChatRequest {
  conversation_id: string | null;
  message: string;
  shortcut?: 'explain' | 'summarize' | 'quiz';
  document_content?: string;
}

export interface ChatResponse {
  conversation_id: string;
  message: Message;
  title: string;
}

export type ProviderType = 'gemini' | 'openai';

export interface SettingsConfig {
  configured: boolean;
  is_custom_key: boolean;
  provider: ProviderType;
  model: string;
  masked_key: string;
}

export interface SettingsUpdate {
  provider: ProviderType;
  api_key?: string;
  model?: string;
}

export interface ModelOption {
  id: string;
  label: string;
  badge?: string;
}

export interface SettingsTestRequest {
  provider: ProviderType;
  api_key?: string;
  model?: string;
  timeout_seconds?: number;
}

export interface ApiError {
  detail: string;
  error_type?: string;
}


