import React, { useState } from 'react';
import {
  X,
  Key,
  Shield,
  Sliders,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { ApiKeys } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeys: ApiKeys;
  onSaveKeys: (keys: ApiKeys) => void;
  systemPrompt: string;
  onSaveSystemPrompt: (prompt: string) => void;
  temperature: number;
  onSaveTemperature: (t: number) => void;
  maxTokens: number;
  onSaveMaxTokens: (m: number) => void;
  onClearSession: () => void;
}

interface TestResult {
  success: boolean;
  message: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  apiKeys,
  onSaveKeys,
  systemPrompt,
  onSaveSystemPrompt,
  temperature,
  onSaveTemperature,
  maxTokens,
  onSaveMaxTokens,
  onClearSession,
}) => {
  const [keys, setKeys] = useState<ApiKeys>({ ...apiKeys });
  const [promptText, setPromptText] = useState(systemPrompt);
  const [temp, setTemp] = useState(temperature);
  const [tokens, setTokens] = useState(maxTokens);
  const [visibleKey, setVisibleKey] = useState<Record<string, boolean>>({});
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Per-provider testing states
  const [testingStatus, setTestingStatus] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, TestResult | null>>({});

  if (!isOpen) return null;

  const toggleShowKey = (provider: string) => {
    setVisibleKey((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const cleanInputKey = (val: string) => {
    if (!val) return '';
    let s = val.trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      s = s.slice(1, -1).trim();
    }
    return s.replace(/[\r\n\t\s]/g, '');
  };

  const handleTestKey = async (provider: string, apiKey: string) => {
    const cleaned = cleanInputKey(apiKey);
    setTestingStatus((prev) => ({ ...prev, [provider]: true }));
    setTestResults((prev) => ({ ...prev, [provider]: null }));

    try {
      const response = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey: cleaned }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setTestResults((prev) => ({
          ...prev,
          [provider]: {
            success: true,
            message: data.message || 'Connection successful! API key is verified and working.',
          },
        }));
      } else {
        setTestResults((prev) => ({
          ...prev,
          [provider]: {
            success: false,
            message: data.error || data.message || 'Connection test failed. Check key validity.',
          },
        }));
      }
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [provider]: {
          success: false,
          message: err.message || 'Network error while attempting connection test.',
        },
      }));
    } finally {
      setTestingStatus((prev) => ({ ...prev, [provider]: false }));
    }
  };

  const handleSave = () => {
    const sanitizedKeys: ApiKeys = {
      claude: cleanInputKey(keys.claude),
      openai: cleanInputKey(keys.openai),
      gemini: cleanInputKey(keys.gemini),
      grok: cleanInputKey(keys.grok),
      tavily: cleanInputKey(keys.tavily),
    };
    onSaveKeys(sanitizedKeys);
    onSaveSystemPrompt(promptText);
    onSaveTemperature(temp);
    onSaveMaxTokens(tokens);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white border border-teal-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 border-b border-teal-100/80 flex items-center justify-between bg-white/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-600 shadow-xs">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Settings & Provider Keys</h2>
              <p className="text-[11px] text-teal-800/80">
                Independent API keys stored locally in your browser with live verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-teal-800 hover:bg-teal-50 cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Free Tier Notice */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/80 text-teal-950 text-xs flex items-start gap-2.5 shadow-xs">
            <Shield className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-teal-900 font-bold">Free Tier Active:</strong> Gemini 3.8 Flash and embeddings require $0 and are pre-configured. You can test each provider key below anytime to verify your access before sending requests!
            </div>
          </div>

          {/* API Keys Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-900 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-teal-600" />
              <span>Independent API Keys & Connection Tests</span>
            </h3>

            {/* Claude Key */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50/50 border border-teal-100">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Anthropic Claude API Key
                </label>
                <span className="text-[10px] text-slate-400 font-mono">sk-ant-...</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type={visibleKey['claude'] ? 'text' : 'password'}
                    placeholder="Paste Anthropic key for Claude-Opus-5.5..."
                    value={keys.claude}
                    onChange={(e) => {
                      setKeys({ ...keys, claude: e.target.value });
                      if (testResults['claude']) setTestResults((prev) => ({ ...prev, claude: null }));
                    }}
                    className="w-full bg-white border border-teal-200 rounded-xl px-3 py-1.5 pr-10 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-400/20 font-mono shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('claude')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    title={visibleKey['claude'] ? 'Hide Key' : 'Show Key'}
                  >
                    {visibleKey['claude'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleTestKey('claude', keys.claude)}
                  disabled={testingStatus['claude']}
                  className="shrink-0 px-3.5 py-1.5 rounded-full border border-teal-200 bg-white hover:bg-teal-50 text-teal-800 active:bg-teal-100 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {testingStatus['claude'] ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Activity className="w-3.5 h-3.5 text-teal-600" />
                      <span>Test Connection</span>
                    </>
                  )}
                </button>
              </div>

              {testResults['claude'] && (
                <div
                  className={`flex items-start gap-2 p-2.5 rounded-xl text-[11px] font-medium transition-all ${
                    testResults['claude'].success
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  {testResults['claude'].success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{testResults['claude'].message}</span>
                </div>
              )}
            </div>

            {/* OpenAI Key */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50/50 border border-teal-100">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  OpenAI API Key
                </label>
                <span className="text-[10px] text-slate-400 font-mono">sk-proj-...</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type={visibleKey['openai'] ? 'text' : 'password'}
                    placeholder="Paste OpenAI key for GPT-4o..."
                    value={keys.openai}
                    onChange={(e) => {
                      setKeys({ ...keys, openai: e.target.value });
                      if (testResults['openai']) setTestResults((prev) => ({ ...prev, openai: null }));
                    }}
                    className="w-full bg-white border border-teal-200 rounded-xl px-3 py-1.5 pr-10 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-400/20 font-mono shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('openai')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    title={visibleKey['openai'] ? 'Hide Key' : 'Show Key'}
                  >
                    {visibleKey['openai'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleTestKey('openai', keys.openai)}
                  disabled={testingStatus['openai']}
                  className="shrink-0 px-3.5 py-1.5 rounded-full border border-teal-200 bg-white hover:bg-teal-50 text-teal-800 active:bg-teal-100 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {testingStatus['openai'] ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Activity className="w-3.5 h-3.5 text-teal-600" />
                      <span>Test Connection</span>
                    </>
                  )}
                </button>
              </div>

              {testResults['openai'] && (
                <div
                  className={`flex items-start gap-2 p-2.5 rounded-xl text-[11px] font-medium transition-all ${
                    testResults['openai'].success
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  {testResults['openai'].success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{testResults['openai'].message}</span>
                </div>
              )}

              <div className="text-[10px] text-slate-500 flex items-center justify-between pt-0.5 px-0.5">
                <span>Supports standard & project keys (<code>sk-proj-...</code>).</span>
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 hover:text-teal-900 hover:underline font-semibold"
                >
                  platform.openai.com/api-keys ↗
                </a>
              </div>
            </div>

            {/* Google Gemini Key */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50/50 border border-teal-100">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                  Google Gemini API Key
                </label>
                <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">Auto-configured in Studio (Free Tier)</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type={visibleKey['gemini'] ? 'text' : 'password'}
                    placeholder="Leave blank to use built-in Studio Free Tier, or paste custom key..."
                    value={keys.gemini}
                    onChange={(e) => {
                      setKeys({ ...keys, gemini: e.target.value });
                      if (testResults['gemini']) setTestResults((prev) => ({ ...prev, gemini: null }));
                    }}
                    className="w-full bg-white border border-teal-200 rounded-xl px-3 py-1.5 pr-10 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-400/20 font-mono shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('gemini')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    title={visibleKey['gemini'] ? 'Hide Key' : 'Show Key'}
                  >
                    {visibleKey['gemini'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleTestKey('gemini', keys.gemini)}
                  disabled={testingStatus['gemini']}
                  className="shrink-0 px-3.5 py-1.5 rounded-full border border-teal-200 bg-white hover:bg-teal-50 text-teal-800 active:bg-teal-100 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {testingStatus['gemini'] ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Activity className="w-3.5 h-3.5 text-teal-600" />
                      <span>Test Connection</span>
                    </>
                  )}
                </button>
              </div>

              {testResults['gemini'] && (
                <div
                  className={`flex items-start gap-2 p-2.5 rounded-xl text-[11px] font-medium transition-all ${
                    testResults['gemini'].success
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  {testResults['gemini'].success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{testResults['gemini'].message}</span>
                </div>
              )}
            </div>

            {/* xAI Grok Key */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50/50 border border-teal-100">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  xAI Grok API Key
                </label>
                <span className="text-[10px] text-slate-400 font-mono">xai-...</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type={visibleKey['grok'] ? 'text' : 'password'}
                    placeholder="Paste xAI key for Grok-2..."
                    value={keys.grok}
                    onChange={(e) => {
                      setKeys({ ...keys, grok: e.target.value });
                      if (testResults['grok']) setTestResults((prev) => ({ ...prev, grok: null }));
                    }}
                    className="w-full bg-white border border-teal-200 rounded-xl px-3 py-1.5 pr-10 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-400/20 font-mono shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('grok')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    title={visibleKey['grok'] ? 'Hide Key' : 'Show Key'}
                  >
                    {visibleKey['grok'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleTestKey('grok', keys.grok)}
                  disabled={testingStatus['grok']}
                  className="shrink-0 px-3.5 py-1.5 rounded-full border border-teal-200 bg-white hover:bg-teal-50 text-teal-800 active:bg-teal-100 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {testingStatus['grok'] ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Activity className="w-3.5 h-3.5 text-teal-600" />
                      <span>Test Connection</span>
                    </>
                  )}
                </button>
              </div>

              {testResults['grok'] && (
                <div
                  className={`flex items-start gap-2 p-2.5 rounded-xl text-[11px] font-medium transition-all ${
                    testResults['grok'].success
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  {testResults['grok'].success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{testResults['grok'].message}</span>
                </div>
              )}

              <div className="text-[10px] text-slate-500 flex items-center justify-between pt-0.5 px-0.5">
                <span>Note: xAI requires funding prepaid credits ($5 min) to activate keys.</span>
                <a
                  href="https://console.x.ai/billing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-700 hover:text-teal-900 hover:underline font-semibold"
                >
                  console.x.ai/billing ↗
                </a>
              </div>
            </div>

            {/* Tavily Web Search Key */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50/50 border border-teal-100">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                  Tavily Web Search API Key
                </label>
                <span className="text-[10px] text-cyan-800 font-semibold bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">Free 1,000/mo at tavily.com</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type={visibleKey['tavily'] ? 'text' : 'password'}
                    placeholder="tvly-... (Sandbox web search fallback active if empty)"
                    value={keys.tavily}
                    onChange={(e) => {
                      setKeys({ ...keys, tavily: e.target.value });
                      if (testResults['tavily']) setTestResults((prev) => ({ ...prev, tavily: null }));
                    }}
                    className="w-full bg-white border border-teal-200 rounded-xl px-3 py-1.5 pr-10 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-400/20 font-mono shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShowKey('tavily')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    title={visibleKey['tavily'] ? 'Hide Key' : 'Show Key'}
                  >
                    {visibleKey['tavily'] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleTestKey('tavily', keys.tavily)}
                  disabled={testingStatus['tavily']}
                  className="shrink-0 px-3.5 py-1.5 rounded-full border border-teal-200 bg-white hover:bg-teal-50 text-teal-800 active:bg-teal-100 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {testingStatus['tavily'] ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Activity className="w-3.5 h-3.5 text-teal-600" />
                      <span>Test Connection</span>
                    </>
                  )}
                </button>
              </div>

              {testResults['tavily'] && (
                <div
                  className={`flex items-start gap-2 p-2.5 rounded-xl text-[11px] font-medium transition-all ${
                    testResults['tavily'].success
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  {testResults['tavily'].success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{testResults['tavily'].message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Model Inference Parameters */}
          <div className="space-y-3 pt-3 border-t border-teal-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-teal-900">
              Inference Parameters
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label className="text-slate-700 font-semibold">Temperature: {temp}</label>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temp}
                  onChange={(e) => setTemp(Number(e.target.value))}
                  className="w-full accent-teal-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label className="text-slate-700 font-semibold">Max Tokens: {tokens}</label>
                </div>
                <input
                  type="range"
                  min="500"
                  max="4000"
                  step="250"
                  value={tokens}
                  onChange={(e) => setTokens(Number(e.target.value))}
                  className="w-full accent-teal-500 cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-800 block mb-1">
                Custom System Prompt Instructions:
              </label>
              <textarea
                rows={3}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                className="w-full bg-slate-50 border border-teal-200 rounded-2xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white font-sans resize-none shadow-xs"
              />
            </div>
          </div>

          {/* Reset Session Section */}
          <div className="pt-3 border-t border-teal-100 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800">Reset Session Memory</div>
              <div className="text-[11px] text-slate-500">
                Clears chat history and active documents while preserving API keys
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm('Clear current session history and documents?')) {
                  onClearSession();
                  onClose();
                }
              }}
              className="px-3.5 py-1.5 rounded-full border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Session</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-teal-100/80 bg-white flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer shadow-xs transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-full bg-teal-500 hover:bg-teal-600 active:bg-teal-700 text-white text-xs font-bold cursor-pointer shadow-md shadow-teal-500/25 flex items-center gap-1.5 transition-all"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-teal-200" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save & Apply</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
