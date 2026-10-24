import React, { useState, useEffect } from 'react';
import {
  Languages,
  ArrowRightLeft,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  BarChart3,
  Cpu,
  Info,
  Clock,
  BookOpen,
  FileCheck2,
  AlertCircle,
  PlayCircle,
} from 'lucide-react';
import {
  getTranslationModels,
  translateText,
  evaluateTranslation,
  getLatestEvaluation,
  formatApiError,
} from '../api';
import type {
  SupportedPair,
  TranslationResponse,
  EvaluationReport,
} from '../types';

const SAMPLE_PROMPTS = [
  {
    label: 'AI in Education',
    lang: 'en',
    text: 'Artificial intelligence is transforming modern education and research.',
  },
  {
    label: 'Deep Learning',
    lang: 'en',
    text: 'Machine translation uses neural networks to understand language patterns.',
  },
  {
    label: 'University Library',
    lang: 'en',
    text: 'The university library provides access to thousands of scientific journals.',
  },
  {
    label: 'Exam Prep (Hindi)',
    lang: 'hi',
    text: 'छात्रों को हर दिन अपने अध्ययन नोट्स की समीक्षा करनी चाहिए।',
  },
  {
    label: 'Mathematics (Hindi)',
    lang: 'hi',
    text: 'गणित सभी भौतिक विज्ञानों की मूलभूत भाषा है।',
  },
];

export const TranslationView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'translate' | 'evaluate'>('translate');

  // Translation State
  const [sourceLang, setSourceLang] = useState<string>('en');
  const [targetLang, setTargetLang] = useState<string>('hi');
  const [inputText, setInputText] = useState<string>('');
  const [translatedResult, setTranslatedResult] = useState<TranslationResponse | null>(null);
  const [translating, setTranslating] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [supportedPairs, setSupportedPairs] = useState<SupportedPair[]>([]);
  const [device, setDevice] = useState<string>('cpu');

  // Evaluation State
  const [evalReport, setEvalReport] = useState<EvaluationReport | null>(null);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [evalDirection, setEvalDirection] = useState<'en_hi' | 'hi_en'>('en_hi');

  // Load models on mount
  useEffect(() => {
    getTranslationModels()
      .then(data => {
        setSupportedPairs(data.supported_pairs || []);
        setDevice(data.device || 'cpu');
      })
      .catch(() => {
        // silent fallback
      });
  }, []);

  // Load default evaluation report on tab change or mount
  useEffect(() => {
    if (activeTab === 'evaluate' && !evalReport) {
      loadEvaluationReport('en', 'hi');
    }
  }, [activeTab]);

  const loadEvaluationReport = async (src: string, tgt: string) => {
    setEvaluating(true);
    setEvalError(null);
    try {
      const data = await getLatestEvaluation(src, tgt);
      setEvalReport(data);
    } catch (err: unknown) {
      setEvalError(formatApiError(err));
    } finally {
      setEvaluating(false);
    }
  };

  const handleRunFreshEvaluation = async () => {
    setEvaluating(true);
    setEvalError(null);
    try {
      const [src, tgt] = evalDirection === 'en_hi' ? ['en', 'hi'] : ['hi', 'en'];
      const data = await evaluateTranslation(src, tgt);
      setEvalReport(data);
    } catch (err: unknown) {
      setEvalError(formatApiError(err));
    } finally {
      setEvaluating(false);
    }
  };

  const handleSwapLanguages = () => {
    const prevSrc = sourceLang;
    const prevTgt = targetLang;
    setSourceLang(prevTgt);
    setTargetLang(prevSrc);
    if (translatedResult) {
      setInputText(translatedResult.translated_text);
      setTranslatedResult(null);
    }
  };

  const handleTranslate = async () => {
    if (!inputText.trim()) {
      setTranslationError('Please enter text to translate.');
      return;
    }
    setTranslating(true);
    setTranslationError(null);
    try {
      const res = await translateText({
        text: inputText.trim(),
        source_lang: sourceLang,
        target_lang: targetLang,
      });
      setTranslatedResult(res);
    } catch (err: unknown) {
      setTranslationError(formatApiError(err));
    } finally {
      setTranslating(false);
    }
  };

  const handleCopy = () => {
    if (!translatedResult?.translated_text) return;
    navigator.clipboard.writeText(translatedResult.translated_text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setInputText('');
    setTranslatedResult(null);
    setTranslationError(null);
  };

  const currentPairModel =
    supportedPairs.find(p => p.source === sourceLang && p.target === targetLang)?.model ||
    (sourceLang === 'en' ? 'Helsinki-NLP/opus-mt-en-hi' : 'Helsinki-NLP/opus-mt-hi-en');

  return (
    <div style={{
      flex: 1,
      height: '100vh',
      overflowY: 'auto',
      backgroundColor: 'var(--cream)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top Banner / Navigation */}
      <div style={{
        padding: '24px 32px 16px',
        borderBottom: '1.5px solid var(--border-sage)',
        backgroundColor: 'var(--surface-white)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: 'var(--soft-mint)',
                border: '1.5px solid var(--border-sage)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--leaf-green)',
              }}>
                <Languages size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--forest-green)', margin: 0 }}>
                    Neural Machine Translation
                  </h1>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    padding: '2px 8px',
                    borderRadius: 20,
                    backgroundColor: 'var(--soft-mint)',
                    color: 'var(--leaf-green)',
                    border: '1px solid var(--sage)',
                  }}>
                    Primary NLP Module
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'rgba(53,83,66,0.65)', margin: '2px 0 0' }}>
                  Hugging Face MarianMT Transformer Architecture • Academic Held-Out Benchmark & Metrics
                </p>
              </div>
            </div>
          </div>

          {/* Model Status Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '6px 14px',
            borderRadius: 20,
            backgroundColor: 'var(--pale-sage)',
            border: '1.5px solid var(--border-sage)',
            fontSize: '0.78rem',
            color: 'var(--forest-green)',
          }}>
            <Cpu size={14} color="var(--leaf-green)" />
            <span>Architecture: <strong>MarianMT (Seq2Seq)</strong></span>
            <span style={{ opacity: 0.3 }}>|</span>
            <span>Device: <code style={{ fontWeight: 700, color: 'var(--leaf-green)' }}>{device.toUpperCase()}</code></span>
          </div>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setActiveTab('translate')}
            id="tab-interactive-translate"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 12,
              border: `1.5px solid ${activeTab === 'translate' ? 'var(--leaf-green)' : 'var(--border-sage)'}`,
              backgroundColor: activeTab === 'translate' ? 'var(--leaf-green)' : 'var(--pale-sage)',
              color: activeTab === 'translate' ? 'white' : 'var(--forest-green)',
              fontWeight: 600,
              fontSize: '0.86rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Languages size={16} />
            Interactive Translation
          </button>

          <button
            onClick={() => setActiveTab('evaluate')}
            id="tab-benchmark-evaluation"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 18px',
              borderRadius: 12,
              border: `1.5px solid ${activeTab === 'evaluate' ? 'var(--leaf-green)' : 'var(--border-sage)'}`,
              backgroundColor: activeTab === 'evaluate' ? 'var(--leaf-green)' : 'var(--pale-sage)',
              color: activeTab === 'evaluate' ? 'white' : 'var(--forest-green)',
              fontWeight: 600,
              fontSize: '0.86rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <BarChart3 size={16} />
            BLEU & chrF Benchmark Evaluation
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '24px 32px 40px', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        {activeTab === 'translate' ? (
          /* ── INTERACTIVE TRANSLATION VIEW ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Language Selection Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderRadius: 16,
              backgroundColor: 'var(--surface-white)',
              border: '1.5px solid var(--border-sage)',
              boxShadow: '0 2px 10px rgba(53,83,66,0.04)',
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(53,83,66,0.6)', marginBottom: 4 }}>
                    Source Language
                  </label>
                  <select
                    value={sourceLang}
                    onChange={e => setSourceLang(e.target.value)}
                    id="source-language-select"
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      border: '1.5px solid var(--border-sage)',
                      backgroundColor: 'var(--pale-sage)',
                      color: 'var(--forest-green)',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="en">English (English)</option>
                    <option value="hi">Hindi (हिंदी)</option>
                  </select>
                </div>

                {/* Swap Button */}
                <button
                  type="button"
                  onClick={handleSwapLanguages}
                  id="swap-languages-btn"
                  title="Swap languages"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    border: '1.5px solid var(--border-sage)',
                    backgroundColor: 'var(--soft-mint)',
                    color: 'var(--forest-green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginTop: 18,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'var(--pale-sage)';
                    e.currentTarget.style.transform = 'rotate(180deg)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'var(--soft-mint)';
                    e.currentTarget.style.transform = 'rotate(0deg)';
                  }}
                >
                  <ArrowRightLeft size={16} />
                </button>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'rgba(53,83,66,0.6)', marginBottom: 4 }}>
                    Target Language
                  </label>
                  <select
                    value={targetLang}
                    onChange={e => setTargetLang(e.target.value)}
                    id="target-language-select"
                    style={{
                      padding: '8px 14px',
                      borderRadius: 10,
                      border: '1.5px solid var(--border-sage)',
                      backgroundColor: 'var(--pale-sage)',
                      color: 'var(--forest-green)',
                      fontSize: '0.88rem',
                      fontWeight: 600,
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="hi">Hindi (हिंदी)</option>
                    <option value="en">English (English)</option>
                  </select>
                </div>
              </div>

              {/* Active Model Indicator */}
              <div style={{ fontSize: '0.76rem', color: 'rgba(53,83,66,0.65)' }}>
                Active Pre-trained Model: <code style={{ backgroundColor: 'var(--soft-mint)', padding: '2px 8px', borderRadius: 6, color: 'var(--leaf-green)', fontWeight: 700 }}>{currentPairModel}</code>
              </div>
            </div>

            {/* Translation Workspace Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 16,
            }}>
              {/* Input Card */}
              <div style={{
                backgroundColor: 'var(--surface-white)',
                borderRadius: 18,
                border: '1.5px solid var(--border-sage)',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 18px rgba(53,83,66,0.04)',
                minHeight: 280,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--forest-green)' }}>
                    Input ({sourceLang === 'en' ? 'English' : 'Hindi'})
                  </span>
                  {inputText && (
                    <button
                      onClick={handleClear}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        color: 'rgba(53,83,66,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <RotateCcw size={12} /> Clear
                    </button>
                  )}
                </div>

                <textarea
                  id="translation-input"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={sourceLang === 'en' ? 'Type or paste academic/study text in English here...' : 'यहाँ हिंदी में पाठ टाइप करें या चिपकाएँ...'}
                  rows={8}
                  style={{
                    flex: 1,
                    width: '100%',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    fontSize: '0.94rem',
                    lineHeight: 1.6,
                    color: 'var(--forest-green)',
                    backgroundColor: 'transparent',
                    fontFamily: 'inherit',
                  }}
                />

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 12,
                  paddingTop: 10,
                  borderTop: '1px solid rgba(223,231,215,0.6)',
                }}>
                  <span style={{ fontSize: '0.72rem', color: 'rgba(53,83,66,0.5)' }}>
                    {inputText.length} / 5,000 characters
                  </span>

                  <button
                    id="btn-translate"
                    onClick={handleTranslate}
                    disabled={translating || !inputText.trim()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '9px 22px',
                      borderRadius: 12,
                      border: 'none',
                      backgroundColor: !inputText.trim() || translating ? 'rgba(99,134,83,0.3)' : 'var(--leaf-green)',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.86rem',
                      cursor: !inputText.trim() || translating ? 'default' : 'pointer',
                      boxShadow: !inputText.trim() || translating ? 'none' : '0 3px 12px rgba(99,134,83,0.35)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {translating ? (
                      <>
                        <Sparkles size={16} className="animate-spin" />
                        Translating...
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        Translate
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Output Card */}
              <div style={{
                backgroundColor: 'var(--surface-white)',
                borderRadius: 18,
                border: '1.5px solid var(--border-sage)',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 4px 18px rgba(53,83,66,0.04)',
                minHeight: 280,
                position: 'relative',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--forest-green)' }}>
                    Translation ({targetLang === 'hi' ? 'Hindi' : 'English'})
                  </span>
                  {translatedResult && (
                    <button
                      id="btn-copy-translation"
                      onClick={handleCopy}
                      title="Copy to clipboard"
                      style={{
                        background: 'none',
                        border: '1px solid var(--border-sage)',
                        borderRadius: 8,
                        padding: '3px 8px',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        color: copied ? 'var(--leaf-green)' : 'var(--forest-green)',
                        backgroundColor: copied ? 'var(--soft-mint)' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'all 0.15s',
                      }}
                    >
                      {copied ? <Check size={13} /> : <Copy size={13} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>

                {translating ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[0, 1, 2].map(i => (
                        <span
                          key={i}
                          className="bounce-dot"
                          style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--leaf-green)' }}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'rgba(53,83,66,0.6)' }}>
                      Inference running through {currentPairModel}...
                    </span>
                  </div>
                ) : translatedResult ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div
                      id="translation-output-text"
                      style={{
                        flex: 1,
                        fontSize: '1rem',
                        lineHeight: 1.7,
                        color: 'var(--forest-green)',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {translatedResult.translated_text}
                    </div>

                    {/* Inference Statistics Footer */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginTop: 12,
                      paddingTop: 10,
                      borderTop: '1px solid rgba(223,231,215,0.6)',
                      fontSize: '0.72rem',
                      color: 'rgba(53,83,66,0.6)',
                      flexWrap: 'wrap',
                    }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} color="var(--leaf-green)" />
                        Latency: <strong>{translatedResult.latency_ms} ms</strong>
                      </span>
                      <span>•</span>
                      <span>Input tokens: <strong>{translatedResult.input_token_count}</strong></span>
                      <span>•</span>
                      <span>Output tokens: <strong>{translatedResult.output_token_count}</strong></span>
                      <span>•</span>
                      <span>Device: <strong>{translatedResult.device.toUpperCase()}</strong></span>
                    </div>
                  </div>
                ) : (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(53,83,66,0.35)', textAlign: 'center', padding: 20 }}>
                    <Languages size={36} style={{ marginBottom: 10, opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: '0.88rem' }}>
                      Translation output will appear here after clicking <strong>Translate</strong>.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {translationError && (
              <div style={{
                padding: '12px 16px',
                borderRadius: 12,
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <AlertCircle size={16} />
                <span>{translationError}</span>
              </div>
            )}

            {/* Sample Prompts */}
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <BookOpen size={14} color="var(--leaf-green)" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--forest-green)' }}>
                  Sample Academic Prompts (Click to test):
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {SAMPLE_PROMPTS.map((sample, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSourceLang(sample.lang);
                      setTargetLang(sample.lang === 'en' ? 'hi' : 'en');
                      setInputText(sample.text);
                    }}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 14,
                      border: '1.5px solid var(--border-sage)',
                      backgroundColor: 'var(--surface-white)',
                      color: 'var(--forest-green)',
                      fontSize: '0.78rem',
                      fontWeight: 500,
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
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── EVALUATION & BENCHMARK VIEW ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Direction & Action Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              borderRadius: 16,
              backgroundColor: 'var(--surface-white)',
              border: '1.5px solid var(--border-sage)',
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--forest-green)' }}>
                  Language Direction:
                </span>
                <select
                  value={evalDirection}
                  onChange={e => {
                    const dir = e.target.value as 'en_hi' | 'hi_en';
                    setEvalDirection(dir);
                    const [src, tgt] = dir === 'en_hi' ? ['en', 'hi'] : ['hi', 'en'];
                    loadEvaluationReport(src, tgt);
                  }}
                  id="eval-direction-select"
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    border: '1.5px solid var(--border-sage)',
                    backgroundColor: 'var(--pale-sage)',
                    color: 'var(--forest-green)',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="en_hi">English → Hindi (Helsinki-NLP/opus-mt-en-hi)</option>
                  <option value="hi_en">Hindi → English (Helsinki-NLP/opus-mt-hi-en)</option>
                </select>
              </div>

              <button
                id="btn-run-evaluation"
                onClick={handleRunFreshEvaluation}
                disabled={evaluating}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 18px',
                  borderRadius: 12,
                  border: 'none',
                  backgroundColor: evaluating ? 'rgba(99,134,83,0.3)' : 'var(--leaf-green)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: evaluating ? 'default' : 'pointer',
                  boxShadow: evaluating ? 'none' : '0 2px 10px rgba(99,134,83,0.3)',
                  transition: 'all 0.15s ease',
                }}
              >
                <PlayCircle size={16} className={evaluating ? 'animate-spin' : ''} />
                {evaluating ? 'Running Transformer Benchmark...' : 'Run Benchmark Evaluation'}
              </button>
            </div>

            {/* Error Message */}
            {evalError && (
              <div style={{
                padding: '12px 16px',
                borderRadius: 12,
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <AlertCircle size={16} />
                <span>{evalError}</span>
              </div>
            )}

            {/* Metric KPI Cards */}
            {evalReport && (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: 16,
                }}>
                  {/* Corpus BLEU Card */}
                  <div style={{
                    padding: '20px',
                    borderRadius: 16,
                    backgroundColor: 'var(--surface-white)',
                    border: '1.5px solid var(--border-sage)',
                    boxShadow: '0 2px 10px rgba(53,83,66,0.04)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(53,83,66,0.6)', textTransform: 'uppercase' }}>
                        Corpus BLEU Score
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 10,
                        backgroundColor: 'var(--soft-mint)',
                        color: 'var(--leaf-green)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                      }}>
                        SacreBLEU
                      </span>
                    </div>
                    <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--leaf-green)', marginTop: 8 }}>
                      {evalReport.metrics.corpus_bleu.score}
                    </div>
                    <p style={{ fontSize: '0.74rem', color: 'rgba(53,83,66,0.65)', margin: '4px 0 0' }}>
                      Brevity Penalty: {evalReport.metrics.corpus_bleu.details.brevity_penalty} • Ref length: {evalReport.metrics.corpus_bleu.details.ref_len} words
                    </p>
                  </div>

                  {/* Corpus chrF Card */}
                  <div style={{
                    padding: '20px',
                    borderRadius: 16,
                    backgroundColor: 'var(--surface-white)',
                    border: '1.5px solid var(--border-sage)',
                    boxShadow: '0 2px 10px rgba(53,83,66,0.04)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(53,83,66,0.6)', textTransform: 'uppercase' }}>
                        Corpus chrF Score
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 10,
                        backgroundColor: 'var(--pale-sage)',
                        color: 'var(--forest-green)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                      }}>
                        Char n-gram F₂
                      </span>
                    </div>
                    <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--forest-green)', marginTop: 8 }}>
                      {evalReport.metrics.corpus_chrf.score}
                    </div>
                    <p style={{ fontSize: '0.74rem', color: 'rgba(53,83,66,0.65)', margin: '4px 0 0' }}>
                      Character order 6 • Ideal for Devanagari morphology
                    </p>
                  </div>

                  {/* Test Dataset Card */}
                  <div style={{
                    padding: '20px',
                    borderRadius: 16,
                    backgroundColor: 'var(--surface-white)',
                    border: '1.5px solid var(--border-sage)',
                    boxShadow: '0 2px 10px rgba(53,83,66,0.04)',
                  }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(53,83,66,0.6)', textTransform: 'uppercase' }}>
                      Test Dataset
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--forest-green)', marginTop: 8 }}>
                      {evalReport.sample_count} Parallel Pairs
                    </div>
                    <p style={{ fontSize: '0.74rem', color: 'rgba(53,83,66,0.65)', margin: '6px 0 0' }}>
                      {evalReport.dataset_name}
                    </p>
                  </div>

                  {/* Speed & Model Card */}
                  <div style={{
                    padding: '20px',
                    borderRadius: 16,
                    backgroundColor: 'var(--surface-white)',
                    border: '1.5px solid var(--border-sage)',
                    boxShadow: '0 2px 10px rgba(53,83,66,0.04)',
                  }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(53,83,66,0.6)', textTransform: 'uppercase' }}>
                      Mean Inference Latency
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--forest-green)', marginTop: 8 }}>
                      {evalReport.average_latency_ms} ms / pair
                    </div>
                    <p style={{ fontSize: '0.74rem', color: 'rgba(53,83,66,0.65)', margin: '6px 0 0' }}>
                      Model: <strong>{evalReport.model_identifier}</strong>
                    </p>
                  </div>
                </div>

                {/* Metric Definitions & Methodology Info */}
                <div style={{
                  padding: '20px 24px',
                  borderRadius: 16,
                  backgroundColor: 'var(--pale-sage)',
                  border: '1.5px solid var(--border-sage)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Info size={16} color="var(--leaf-green)" />
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--forest-green)' }}>
                      Metric Definitions & Academic Methodology
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, fontSize: '0.82rem', color: 'var(--forest-green)', lineHeight: 1.5 }}>
                    <div>
                      <strong>BLEU (Bilingual Evaluation Understudy):</strong> Computes geometric mean of modified n-gram precisions (1 to 4 grams) penalizing hyp-length discrepancies via Brevity Penalty:
                      <div style={{ fontFamily: 'monospace', backgroundColor: 'var(--surface-white)', padding: '6px 10px', borderRadius: 6, margin: '6px 0', border: '1px solid var(--border-sage)', fontSize: '0.75rem' }}>
                        BLEU = BP × exp(∑ w_n log p_n)
                      </div>
                      Standard BLEU benchmark indicates solid semantic accuracy on parallel corpora.
                    </div>
                    <div>
                      <strong>chrF (Character n-gram F-score):</strong> Operates on character n-grams (order 6, β=2 giving recall double the weight of precision):
                      <div style={{ fontFamily: 'monospace', backgroundColor: 'var(--surface-white)', padding: '6px 10px', borderRadius: 6, margin: '6px 0', border: '1px solid var(--border-sage)', fontSize: '0.75rem' }}>
                        chrF = (1 + β²) × (CHRP × CHRR) / (β² × CHRP + CHRR)
                      </div>
                      Crucial for Hindi because Devanagari inflections and agglutinative postpositions heavily penalize word-based BLEU while chrF properly recognizes morphological roots.
                    </div>
                  </div>
                </div>

                {/* Sample-by-Sample Inspection Table */}
                <div style={{
                  backgroundColor: 'var(--surface-white)',
                  borderRadius: 16,
                  border: '1.5px solid var(--border-sage)',
                  overflow: 'hidden',
                  boxShadow: '0 2px 10px rgba(53,83,66,0.04)',
                }}>
                  <div style={{
                    padding: '16px 20px',
                    borderBottom: '1.5px solid var(--border-sage)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: 'var(--surface-white)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileCheck2 size={16} color="var(--leaf-green)" />
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--forest-green)' }}>
                        Held-Out Test Sample Predictions & Error Review
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(53,83,66,0.6)' }}>
                      Showing {evalReport.sample_results.length} evaluated sentence pairs
                    </span>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--pale-sage)', borderBottom: '1px solid var(--border-sage)' }}>
                          <th style={{ padding: '10px 14px', width: 40, color: 'var(--forest-green)' }}>#</th>
                          <th style={{ padding: '10px 14px', width: 140, color: 'var(--forest-green)' }}>Domain</th>
                          <th style={{ padding: '10px 14px', color: 'var(--forest-green)' }}>Source Text</th>
                          <th style={{ padding: '10px 14px', color: 'var(--forest-green)' }}>Gold Reference</th>
                          <th style={{ padding: '10px 14px', color: 'var(--forest-green)' }}>MarianMT Generated</th>
                          <th style={{ padding: '10px 14px', width: 80, textAlign: 'right', color: 'var(--forest-green)' }}>BLEU</th>
                          <th style={{ padding: '10px 14px', width: 80, textAlign: 'right', color: 'var(--forest-green)' }}>chrF</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evalReport.sample_results.map((item, idx) => (
                          <tr
                            key={item.id}
                            style={{
                              borderBottom: '1px solid rgba(223,231,215,0.6)',
                              backgroundColor: idx % 2 === 0 ? 'var(--surface-white)' : 'rgba(253,251,245,0.5)',
                            }}
                          >
                            <td style={{ padding: '10px 14px', color: 'rgba(53,83,66,0.6)', fontWeight: 600 }}>{item.id}</td>
                            <td style={{ padding: '10px 14px' }}>
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: 10,
                                backgroundColor: 'var(--soft-mint)',
                                color: 'var(--forest-green)',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                              }}>
                                {item.domain}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', color: 'var(--forest-green)' }}>{item.source}</td>
                            <td style={{ padding: '10px 14px', color: 'rgba(53,83,66,0.75)' }}>{item.reference}</td>
                            <td style={{ padding: '10px 14px', color: 'var(--leaf-green)', fontWeight: 500 }}>{item.hypothesis}</td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: item.sentence_bleu > 30 ? 'var(--leaf-green)' : 'var(--forest-green)' }}>
                              {item.sentence_bleu}
                            </td>
                            <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: item.sentence_chrf > 50 ? 'var(--leaf-green)' : 'var(--forest-green)' }}>
                              {item.sentence_chrf}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Academic Discussion & Research Limitations */}
                <div style={{
                  padding: '22px 24px',
                  borderRadius: 16,
                  backgroundColor: 'var(--surface-white)',
                  border: '1.5px solid var(--border-sage)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  boxShadow: '0 2px 10px rgba(53,83,66,0.04)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={18} color="var(--leaf-green)" />
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--forest-green)', margin: 0 }}>
                      Academic Discussion & Linguistic Limitations
                    </h3>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                    <div>
                      <h4 style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--leaf-green)', margin: '0 0 8px' }}>
                        Model Strengths:
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.8rem', color: 'var(--forest-green)', lineHeight: 1.6 }}>
                        {evalReport.academic_discussion.strengths.map((str, idx) => (
                          <li key={idx} style={{ marginBottom: 4 }}>{str}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 style={{ fontSize: '0.84rem', fontWeight: 700, color: '#dc2626', margin: '0 0 8px' }}>
                        Linguistic Challenges & Limitations:
                      </h4>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.8rem', color: 'var(--forest-green)', lineHeight: 1.6 }}>
                        {evalReport.academic_discussion.limitations.map((lim, idx) => (
                          <li key={idx} style={{ marginBottom: 4 }}>{lim}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
