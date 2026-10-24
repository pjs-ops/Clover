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

// ── Machine Translation & Evaluation Types ────────────────────────────────────

export interface SupportedPair {
  source: string;
  source_name: string;
  target: string;
  target_name: string;
  model: string;
  loaded: boolean;
}

export interface TranslationModelsResponse {
  supported_pairs: SupportedPair[];
  device: string;
  default_pair: { source: string; target: string };
}

export interface TranslationRequest {
  text: string;
  source_lang: string;
  target_lang: string;
}

export interface TranslationResponse {
  source_text: string;
  translated_text: string;
  source_lang: string;
  source_lang_name: string;
  target_lang: string;
  target_lang_name: string;
  model_name: string;
  device: string;
  latency_ms: number;
  input_token_count: number;
  output_token_count: number;
}

export interface EvaluationSampleResult {
  id: number;
  domain: string;
  source: string;
  reference: string;
  hypothesis: string;
  sentence_bleu: number;
  sentence_chrf: number;
  latency_ms: number;
}

export interface EvaluationReport {
  dataset_name: string;
  model_identifier: string;
  source_language: string;
  target_language: string;
  sample_count: number;
  total_evaluation_time_seconds: number;
  average_latency_ms: number;
  metrics: {
    corpus_bleu: {
      score: number;
      max_score: number;
      definition: string;
      details: {
        precisions: number[];
        brevity_penalty: number;
        sys_len: number;
        ref_len: number;
      };
    };
    corpus_chrf: {
      score: number;
      max_score: number;
      definition: string;
    };
  };
  metric_definitions: {
    BLEU: string;
    chrF: string;
  };
  sample_results: EvaluationSampleResult[];
  academic_discussion: {
    strengths: string[];
    limitations: string[];
  };
  timestamp: number;
}



