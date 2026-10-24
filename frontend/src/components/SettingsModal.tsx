import React, { useState, useEffect } from 'react';
import { X, Settings, Key, Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw, Trash2 } from 'lucide-react';
import { getSettings, updateSettings, disconnectSettings, testSettingsConnection } from '../api';
import type { ProviderType, SettingsConfig, ModelOption } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: (config: SettingsConfig) => void;
}

export const GEMINI_MODELS: ModelOption[] = [
  { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', badge: 'Recommended • Fast & Stable' },
  { id: 'gemini-flash-lite-latest', label: 'Gemini Flash-Lite Latest', badge: 'Fast & Lightweight' },
  { id: 'gemini-flash-latest', label: 'Gemini Flash Latest', badge: 'Auto-Updated Stable' },
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash', badge: 'Advanced Preview' },
  { id: 'gemini-pro-latest', label: 'Gemini Pro Latest', badge: 'Complex Reasoning' },
];

export const OPENAI_MODELS: ModelOption[] = [
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', badge: 'Fast & Affordable' },
  { id: 'gpt-4o', label: 'GPT-4o', badge: 'Most Intelligent' },
  { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', badge: 'Classic' },
];

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, onConfigSaved }) => {
  const [config, setConfig] = useState<SettingsConfig | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>('gemini');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setTestResult(null);
      setSaveSuccess(false);
      setApiKeyInput('');
      setLoading(true);

      getSettings()
        .then(data => {
          setConfig(data);
          setSelectedProvider(data.provider);
          setSelectedModel(data.model || (data.provider === 'gemini' ? 'gemini-3.5-flash' : 'gpt-4o-mini'));
        })
        .catch(() => {
          // silent fallback
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen]);

  // Sync default model when provider switches
  const handleProviderChange = (prov: ProviderType) => {
    setSelectedProvider(prov);
    setTestResult(null);
    setSaveSuccess(false);
    if (prov === 'gemini') {
      setSelectedModel('gemini-3.5-flash');
    } else {
      setSelectedModel('gpt-4o-mini');
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setSaveSuccess(false);

    try {
      const res = await testSettingsConnection({
        provider: selectedProvider,
        api_key: apiKeyInput.trim() || undefined,
        model: selectedModel,
        timeout_seconds: 15,
      });
      setTestResult({ success: true, message: res.message || 'Connection verified successfully!' });
    } catch (err: unknown) {
      let msg = 'Connection test failed.';
      if (err && typeof err === 'object' && 'response' in err) {
        const ax = err as { response?: { status?: number; data?: { detail?: string } } };
        if (ax.response?.data?.detail) {
          msg = ax.response.data.detail;
        } else if (ax.response?.status === 504) {
          msg = 'Connection test timed out waiting for the provider. Please check your network or try a faster model.';
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setTestResult({ success: false, message: msg });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveSuccess(false);
    setTestResult(null);

    try {
      const updated = await updateSettings({
        provider: selectedProvider,
        api_key: apiKeyInput.trim() || undefined,
        model: selectedModel,
      });
      setConfig(updated);
      setApiKeyInput('');
      setSaveSuccess(true);
      if (onConfigSaved) {
        onConfigSaved(updated);
      }
    } catch (err: unknown) {
      let msg = 'Failed to save configuration.';
      if (err instanceof Error) msg = err.message;
      setTestResult({ success: false, message: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setTestResult(null);
    try {
      await disconnectSettings();
      const updated = await getSettings();
      setConfig(updated);
      setApiKeyInput('');
      setSaveSuccess(false);
      if (onConfigSaved) {
        onConfigSaved(updated);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modelsList = selectedProvider === 'gemini' ? GEMINI_MODELS : OPENAI_MODELS;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(57, 52, 67, 0.45)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 16,
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        boxShadow: '0 12px 40px rgba(155, 127, 212, 0.25)',
        width: '100%',
        maxWidth: 500,
        overflow: 'hidden',
        border: '1.5px solid rgba(155, 127, 212, 0.2)',
        animation: 'fadeIn 0.2s ease-out',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FAF8F5',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: 'var(--lavender)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9B7FD4',
            }}>
              <Settings size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark)', margin: 0 }}>
                AI Provider Settings
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'rgba(57, 52, 67, 0.6)', margin: 0 }}>
                Connect your personal API key for reliable responses
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(57, 52, 67, 0.4)',
              padding: 4,
              borderRadius: 8,
              display: 'flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Provider Tabs */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--dark)', marginBottom: 8 }}>
              Select Provider
            </label>
            <div style={{
              display: 'flex',
              gap: 8,
              backgroundColor: '#FAF8F5',
              padding: 4,
              borderRadius: 14,
              border: '1px solid rgba(0,0,0,0.06)',
            }}>
              <button
                type="button"
                onClick={() => handleProviderChange('gemini')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: 'none',
                  backgroundColor: selectedProvider === 'gemini' ? '#FFFFFF' : 'transparent',
                  color: selectedProvider === 'gemini' ? '#9B7FD4' : 'rgba(57,52,67,0.6)',
                  fontWeight: selectedProvider === 'gemini' ? 700 : 500,
                  fontSize: '0.85rem',
                  boxShadow: selectedProvider === 'gemini' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                ✨ Google Gemini
              </button>
              <button
                type="button"
                onClick={() => handleProviderChange('openai')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 10,
                  border: 'none',
                  backgroundColor: selectedProvider === 'openai' ? '#FFFFFF' : 'transparent',
                  color: selectedProvider === 'openai' ? '#9B7FD4' : 'rgba(57,52,67,0.6)',
                  fontWeight: selectedProvider === 'openai' ? 700 : 500,
                  fontSize: '0.85rem',
                  boxShadow: selectedProvider === 'openai' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                🤖 OpenAI
              </button>
            </div>
          </div>

          {/* Model Selection */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--dark)' }}>
                Model Selection
              </label>
              <span style={{ fontSize: '0.72rem', color: 'rgba(57, 52, 67, 0.6)' }}>
                API ID: <code style={{ backgroundColor: '#F3EEFB', padding: '1px 6px', borderRadius: 4, color: '#9B7FD4', fontWeight: 700 }}>{selectedModel}</code>
              </span>
            </div>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              id="model-selector"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 12,
                border: '1.5px solid rgba(155, 127, 212, 0.25)',
                fontSize: '0.88rem',
                color: 'var(--dark)',
                backgroundColor: '#FFFFFF',
                outline: 'none',
              }}
            >
              {modelsList.map(m => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.id}){m.badge ? ` — ${m.badge}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* API Key Input */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--dark)' }}>
                {selectedProvider === 'gemini' ? 'Gemini API Key' : 'OpenAI API Key'}
              </label>
              {config?.masked_key && (
                <span style={{ fontSize: '0.72rem', color: '#16A34A', fontWeight: 600 }}>
                  Active: {config.masked_key}
                </span>
              )}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              border: '1.5px solid rgba(155, 127, 212, 0.25)',
              padding: '2px 10px',
            }}>
              <Key size={16} color="rgba(57,52,67,0.4)" style={{ marginRight: 8, flexShrink: 0 }} />
              <input
                type={showKey ? 'text' : 'password'}
                placeholder={config?.is_custom_key ? 'Enter new key to replace' : (selectedProvider === 'gemini' ? 'AIzaSy...' : 'sk-...')}
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.88rem',
                  color: 'var(--dark)',
                  backgroundColor: 'transparent',
                }}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'rgba(57,52,67,0.4)',
                  padding: 4,
                  display: 'flex',
                }}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Feedback messages */}
          {testResult && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 12,
              backgroundColor: testResult.success ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${testResult.success ? '#BBF7D0' : '#FECACA'}`,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              fontSize: '0.8rem',
              color: testResult.success ? '#166534' : '#991B1B',
            }}>
              {testResult.success ? <CheckCircle2 size={16} style={{ marginTop: 2, flexShrink: 0 }} /> : <AlertCircle size={16} style={{ marginTop: 2, flexShrink: 0 }} />}
              <div>{testResult.message}</div>
            </div>
          )}

          {saveSuccess && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 12,
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.8rem',
              color: '#166534',
            }}>
              <CheckCircle2 size={16} />
              Configuration saved for your session!
            </div>
          )}

          {/* Privacy Note */}
          <div style={{
            fontSize: '0.72rem',
            color: 'rgba(57, 52, 67, 0.55)',
            backgroundColor: '#FAF8F5',
            padding: '10px 12px',
            borderRadius: 10,
            lineHeight: 1.4,
          }}>
            🔒 <strong>Session Privacy:</strong> Your key is transmitted directly to your local backend session memory and never stored in browser storage (localStorage) or written to disk.
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          backgroundColor: '#FAF8F5',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
        }}>
          {config?.is_custom_key ? (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={loading || testing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 12px',
                borderRadius: 12,
                border: '1px solid #FECACA',
                backgroundColor: '#FFFFFF',
                color: '#DC2626',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Trash2 size={14} />
              Disconnect
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 12,
                border: '1.5px solid rgba(155, 127, 212, 0.3)',
                backgroundColor: '#FFFFFF',
                color: '#9B7FD4',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: testing ? 'default' : 'pointer',
              }}
            >
              <RefreshCw size={14} className={testing ? 'animate-spin' : ''} />
              {testing ? 'Testing...' : 'Test Connection'}
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={loading || testing}
              style={{
                padding: '8px 18px',
                borderRadius: 12,
                border: 'none',
                backgroundColor: '#9B7FD4',
                color: '#FFFFFF',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: loading ? 'default' : 'pointer',
                boxShadow: '0 2px 8px rgba(155, 127, 212, 0.35)',
              }}
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
