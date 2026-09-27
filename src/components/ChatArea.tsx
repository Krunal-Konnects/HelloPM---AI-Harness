import React, { useState } from 'react';
import {
  Bot,
  User,
  Sparkles,
  Coins,
  Globe,
  FileText,
  Mail,
  Send,
  Edit3,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  Layers,
  Search,
} from 'lucide-react';
import { ChatMessage } from '../types';
import { formatCost } from '../utils/costCalculator';

interface ChatAreaProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onOpenSettings: () => void;
  onSwitchToGemini: () => void;
  onRetry: (prompt: string) => void;
  onSendEmailDraft: (draft: { to: string; subject: string; body: string }) => void;
  onSelectChunkSnippet?: (chunkNum: number) => void;
  onQuickPrompt: (prompt: string) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading,
  onOpenSettings,
  onSwitchToGemini,
  onRetry: _onRetry,
  onSendEmailDraft,
  onSelectChunkSnippet,
  onQuickPrompt,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSearchId, setExpandedSearchId] = useState<string | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [draftEdits, setDraftEdits] = useState<{ to: string; subject: string; body: string }>({
    to: '',
    subject: '',
    body: '',
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStartEditDraft = (msgId: string, draft: { to: string; subject: string; body: string }) => {
    setEditingDraftId(msgId);
    setDraftEdits({ ...draft });
  };

  const handleSaveDraft = (msg: ChatMessage) => {
    if (msg.emailDraft) {
      msg.emailDraft.to = draftEdits.to;
      msg.emailDraft.subject = draftEdits.subject;
      msg.emailDraft.body = draftEdits.body;
    }
    setEditingDraftId(null);
  };

  const quickPrompts = [
    {
      title: 'Document RAG & Email Draft',
      desc: 'Load Q3 Report, summarize key drivers, and draft an email response to boss',
      prompt: 'Summarize my Q3 report focusing on revenue and marketing results, then draft a professional email update to my boss with the highlights.',
      icon: FileText,
      tag: 'RAG Flow',
    },
    {
      title: 'Multi-Model Switch (GPT-4o)',
      desc: 'Route query to GPT-4o to analyze token economics and chunking trade-offs',
      prompt: 'Use GPT to explain the trade-offs of 500-word document chunking versus sentence-window retrieval in RAG systems.',
      icon: Layers,
      tag: 'Routing',
    },
    {
      title: 'Tavily Web Search',
      desc: 'Verify latest 2026 breakthroughs in AI agent routing and multi-model harnesses',
      prompt: "What's new in multi-model AI agent harnesses and API routing this week? Search the web.",
      icon: Search,
      tag: 'Live Web',
    },
    {
      title: 'Claude Analytical Synthesis',
      desc: 'Engage Claude Opus for deep comparative reasoning and architecture',
      prompt: 'Use Claude to draft a formal executive briefing comparing cloud GPU costs against inference API provider pricing.',
      icon: ShieldCheck,
      tag: 'Synthesis',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
      {messages.length === 0 ? (
        <div className="max-w-3xl mx-auto py-10 text-center space-y-7">
          {/* Hero Emblem matching the dental/wellness clean 3D shield aesthetic */}
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-teal-400/30 via-teal-50 to-emerald-100/50 border border-teal-200/70 flex items-center justify-center text-teal-600 shadow-lg shadow-teal-500/15">
            <Sparkles className="w-10 h-10 text-teal-600" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full shadow-xs">
              Autonomous Intelligence Gateway
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight pt-1">
              AI Harness Orchestrator
            </h2>
            <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
              Seamless routing across Claude Opus, GPT-4o, Gemini 3.8 Flash, and Grok. Enhanced with high-precision RAG chunking, Gmail workflows, and web search.
            </p>
          </div>

          {/* Quick Actions Grid matching reference UI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left pt-2">
            {quickPrompts.map((item, idx) => {
              const IconComp = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => onQuickPrompt(item.prompt)}
                  className="p-4 rounded-2xl bg-white/95 hover:bg-white border border-teal-100/90 hover:border-teal-300 text-left transition-all cursor-pointer group shadow-sm shadow-teal-950/5 hover:shadow-md hover:shadow-teal-500/10 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center text-xs">
                        <IconComp className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-xs font-bold text-slate-800 group-hover:text-teal-700 transition-colors">
                        {item.title}
                      </span>
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                        {item.tag}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed pl-8">
                      {item.desc}
                    </p>
                  </div>
                  {/* Circular button with arrow icon like in the screenshot */}
                  <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 group-hover:bg-teal-500 group-hover:text-white flex items-center justify-center shrink-0 transition-all shadow-xs group-hover:shadow-teal-500/25 mt-0.5">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';

            return (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {/* Assistant Avatar */}
                {!isUser && (
                  <div className="w-9 h-9 rounded-2xl bg-white border border-teal-200/80 flex items-center justify-center text-teal-600 shrink-0 mt-1 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`flex flex-col space-y-1.5 max-w-[85%] sm:max-w-[78%] ${
                    isUser ? 'items-end' : 'items-start'
                  }`}
                >
                  {/* Model & Token Meta Header for Assistant */}
                  {!isUser && (
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 px-1">
                      <span className="font-bold text-teal-900 uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200/80">
                        {msg.model || 'gemini-3.8-flash'}
                      </span>
                      {msg.tokens && (
                        <span>
                          {msg.tokens.total} tokens (in: {msg.tokens.input}, out: {msg.tokens.output})
                        </span>
                      )}
                      {msg.cost !== undefined && (
                        <span className="flex items-center gap-1 font-semibold text-teal-800">
                          <Coins className="w-3 h-3 text-teal-600" />
                          {formatCost(msg.cost, msg.isFreeTier)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message Bubble styled with the reference UI's rounded elegance */}
                  <div
                    className={`px-5 py-3.5 text-sm leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-3xl rounded-br-lg shadow-md shadow-teal-500/20 font-normal'
                        : 'bg-white/95 backdrop-blur-sm border border-teal-100/90 text-slate-800 rounded-3xl rounded-bl-lg shadow-sm shadow-teal-950/5 w-full'
                    }`}
                  >
                    {/* Error Banner inside message if present */}
                    {msg.error && (
                      <div className="mb-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="font-bold text-rose-900">{msg.error.message}</div>
                            {msg.error.code && (
                              <div className="text-[10px] text-rose-700 font-mono mt-0.5">
                                Code: {msg.error.code}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          {msg.error.actionType === 'settings' && (
                            <button
                              onClick={onOpenSettings}
                              className="px-3 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs cursor-pointer shadow-xs"
                            >
                              Open Settings & Add Key
                            </button>
                          )}
                          <button
                            onClick={onSwitchToGemini}
                            className="px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium text-xs cursor-pointer shadow-xs"
                          >
                            Switch to Free Gemini
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Formatted Text Content */}
                    <div className="whitespace-pre-wrap font-sans text-sm text-slate-800">
                      {msg.content}
                    </div>

                    {/* Citations Chips */}
                    {msg.documentCitations && msg.documentCitations.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-teal-50 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-teal-800 font-semibold flex items-center gap-1">
                          <FileText className="w-3 h-3 text-teal-600" />
                          Source Citations:
                        </span>
                        {msg.documentCitations.map((cit, cIdx) => (
                          <button
                            key={cIdx}
                            onClick={() => onSelectChunkSnippet && onSelectChunkSnippet(cit.chunkNum)}
                            className="text-[11px] px-2.5 py-0.5 rounded-full bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200/80 cursor-pointer font-medium transition-colors"
                          >
                            [{cit.docName} - Chunk {cit.chunkNum}]
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Web Search Sources Accordion */}
                    {msg.webResults && msg.webResults.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-teal-50">
                        <button
                          onClick={() =>
                            setExpandedSearchId(expandedSearchId === msg.id ? null : msg.id)
                          }
                          className="flex items-center justify-between w-full text-xs text-teal-700 hover:text-teal-900 cursor-pointer font-semibold"
                        >
                          <span className="flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-teal-600" />
                            {msg.webResults.length} Verified Web Sources (Tavily)
                          </span>
                          {expandedSearchId === msg.id ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {expandedSearchId === msg.id && (
                          <div className="mt-2.5 space-y-2 pt-1">
                            {msg.webResults.map((webRes, wIdx) => (
                              <div
                                key={wIdx}
                                className="p-3 rounded-xl bg-teal-50/40 border border-teal-100 text-xs space-y-1"
                              >
                                <div className="font-semibold text-slate-800 flex items-center justify-between">
                                  <span className="line-clamp-1">{webRes.title}</span>
                                  {webRes.url && (
                                    <a
                                      href={webRes.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-teal-600 hover:underline inline-flex items-center gap-0.5 shrink-0 ml-2"
                                    >
                                      <span>Link</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  )}
                                </div>
                                <p className="text-slate-600 text-[11px] line-clamp-2">
                                  {webRes.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Gmail Draft Card Component */}
                    {msg.emailDraft && (
                      <div className="mt-4 rounded-2xl border border-teal-100 bg-teal-50/30 p-4 space-y-3.5">
                        <div className="flex items-center justify-between border-b border-teal-100 pb-2.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                            <Mail className="w-4 h-4 text-teal-600" />
                            <span>Drafted Email Ready for Review</span>
                          </div>
                          {msg.emailDraft.isSent && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Sent Successfully
                            </span>
                          )}
                        </div>

                        {editingDraftId === msg.id ? (
                          <div className="space-y-2 text-xs">
                            <div>
                              <label className="text-[10px] uppercase font-bold text-slate-600 block mb-0.5">To:</label>
                              <input
                                type="email"
                                value={draftEdits.to}
                                onChange={(e) => setDraftEdits({ ...draftEdits, to: e.target.value })}
                                className="w-full bg-white border border-teal-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-bold text-slate-600 block mb-0.5">Subject:</label>
                              <input
                                type="text"
                                value={draftEdits.subject}
                                onChange={(e) => setDraftEdits({ ...draftEdits, subject: e.target.value })}
                                className="w-full bg-white border border-teal-200 rounded-xl px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase font-bold text-slate-600 block mb-0.5">Body:</label>
                              <textarea
                                rows={4}
                                value={draftEdits.body}
                                onChange={(e) => setDraftEdits({ ...draftEdits, body: e.target.value })}
                                className="w-full bg-white border border-teal-200 rounded-xl px-3 py-2 text-slate-800 resize-none font-sans focus:outline-none focus:ring-2 focus:ring-teal-400"
                              />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={() => handleSaveDraft(msg)}
                                className="px-3.5 py-1.5 bg-teal-500 hover:bg-teal-600 text-white rounded-full text-xs font-semibold cursor-pointer shadow-xs"
                              >
                                Save Changes
                              </button>
                              <button
                                onClick={() => setEditingDraftId(null)}
                                className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full text-xs cursor-pointer shadow-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 text-xs text-slate-700">
                            <div>
                              <strong className="text-slate-900 font-semibold">To:</strong> {msg.emailDraft.to}
                            </div>
                            <div>
                              <strong className="text-slate-900 font-semibold">Subject:</strong> {msg.emailDraft.subject}
                            </div>
                            <div className="p-3 rounded-xl bg-white border border-teal-100 font-mono text-[11px] whitespace-pre-wrap text-slate-800 shadow-xs">
                              {msg.emailDraft.body}
                            </div>

                            {!msg.emailDraft.isSent && (
                              <div className="flex items-center gap-2 pt-2">
                                <button
                                  onClick={() => handleStartEditDraft(msg.id, msg.emailDraft!)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white hover:bg-teal-50 text-slate-700 font-medium text-xs cursor-pointer border border-teal-200 shadow-xs transition-colors"
                                >
                                  <Edit3 className="w-3 h-3 text-slate-500" />
                                  <span>Edit Draft</span>
                                </button>
                                <button
                                  onClick={() => onSendEmailDraft(msg.emailDraft!)}
                                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-teal-500 hover:bg-teal-600 text-white font-semibold text-xs cursor-pointer shadow-md shadow-teal-500/25 active:scale-95 transition-all"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Send via Gmail</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bubble Actions */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1">
                    <span>{msg.timestamp}</span>
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="hover:text-teal-700 cursor-pointer flex items-center gap-1 transition-colors"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-teal-600" />
                          <span className="text-teal-600 font-medium">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* User Avatar with smooth teal gradient */}
                {isUser && (
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 text-white flex items-center justify-center shrink-0 mt-1 shadow-sm shadow-teal-500/25">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading Indicator with teal pulse */}
          {isLoading && (
            <div className="flex gap-3.5 items-start">
              <div className="w-9 h-9 rounded-2xl bg-white border border-teal-200/80 flex items-center justify-center text-teal-600 shrink-0 animate-pulse shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-4 rounded-3xl rounded-bl-lg bg-white/95 border border-teal-100 text-xs text-slate-600 flex items-center gap-3 shadow-sm shadow-teal-900/5">
                <div className="flex space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-slate-700 font-medium">Orchestrating request across multi-provider harness & context lookup...</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
