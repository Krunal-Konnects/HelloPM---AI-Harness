import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Globe,
  FilePlus,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { ModelId, UploadedDocument } from '../types';
import { estimateTokens, calculateEstimatedCost, formatCost, getModelMeta } from '../utils/costCalculator';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  selectedModel: ModelId;
  searchEnabled: boolean;
  onToggleSearch: (enabled: boolean) => void;
  searchCount: number;
  maxSearchLimit: number;
  documents: UploadedDocument[];
  onUploadFile: (file: File) => void;
  onLoadSampleDoc: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  selectedModel,
  searchEnabled,
  onToggleSearch,
  searchCount,
  maxSearchLimit,
  documents,
  onUploadFile,
  onLoadSampleDoc,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic token accounting
  const inputTokensEst = estimateTokens(text);
  const docTokensEst = documents.reduce((acc, doc) => {
    // Only top 3 chunks are typically sent to LLM per prompt
    const chunkWords = doc.chunks.slice(0, 3).reduce((cAcc, c) => cAcc + c.wordCount, 0);
    return acc + Math.ceil(chunkWords * 1.33);
  }, 0);
  const systemTokensEst = 50;
  const totalInputTokensEst = text.trim() ? inputTokensEst + docTokensEst + systemTokensEst : 0;
  const estimatedCost = calculateEstimatedCost(selectedModel, totalInputTokensEst, 200);

  const modelMeta = getModelMeta(selectedModel);
  const isSearchNearLimit = searchCount >= maxSearchLimit * 0.8;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!text.trim() || isLoading) return;
    onSendMessage(text.trim());
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      e.target.value = '';
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  return (
    <div className="border-t border-teal-100/80 bg-white/90 backdrop-blur-md p-3 sm:p-4 shadow-sm">
      <div className="max-w-4xl mx-auto space-y-2.5">
        {/* Token Estimation & Pre-send Cost Tracker Bar */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2 px-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              Routing to: <strong className="text-teal-950 font-bold">{modelMeta.name}</strong>
            </span>
            {documents.length > 0 && (
              <span className="text-[11px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/60 font-medium">
                {documents.length} doc active (+~{docTokensEst} tokens)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-slate-500">
              Est. input: <strong className="text-slate-800 font-semibold">{totalInputTokensEst}</strong> tokens
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200/80 text-teal-900 font-medium text-[11px]">
              Est. cost: <strong className="text-teal-700 font-bold">{formatCost(estimatedCost, modelMeta.isFree)}</strong>
            </span>
          </div>
        </div>

        {/* Text Input Container styled with reference design's smooth squircle card */}
        <div className="relative rounded-2xl border border-teal-200/80 bg-white focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-400/20 transition-all shadow-sm shadow-teal-950/5">
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask a question, analyze documents, draft emails, or search... (e.g. "Summarize Q3 report and draft email to boss")`}
            className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 px-4 pt-3.5 pb-12 focus:outline-none resize-none max-h-44 min-h-[50px]"
          />

          {/* Bottom Toolbar inside Input */}
          <div className="absolute left-3 right-3 bottom-2.5 flex items-center justify-between pointer-events-auto">
            {/* Left buttons: Attach Doc, Load Sample, Web Search Toggle */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.xlsx,.xls,.csv,.eml,.txt,.md"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Upload PDF, Excel, EML, or Text document for RAG"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-teal-50/70 hover:bg-teal-100/80 text-teal-800 transition-colors cursor-pointer border border-teal-200/80 shadow-xs"
              >
                <Paperclip className="w-3.5 h-3.5 text-teal-600" />
                <span className="hidden sm:inline">Attach Doc</span>
              </button>

              {documents.length === 0 && (
                <button
                  type="button"
                  onClick={onLoadSampleDoc}
                  title="Load pre-built Q3 Report (PDF) with financial & marketing chunks"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 transition-colors cursor-pointer shadow-xs"
                >
                  <FilePlus className="w-3.5 h-3.5 text-emerald-600" />
                  <span>+ Sample Q3 Report</span>
                </button>
              )}

              {/* Web Search Toggle styled as friendly pill */}
              <button
                type="button"
                onClick={() => onToggleSearch(!searchEnabled)}
                title={searchEnabled ? 'Web Search active (Free Tavily)' : 'Enable Tavily Web Search'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border shadow-xs ${
                  searchEnabled
                    ? 'bg-cyan-500 text-white border-cyan-500 shadow-sm shadow-cyan-500/25'
                    : 'bg-white text-slate-600 border-teal-200/80 hover:text-teal-800 hover:bg-teal-50/50'
                }`}
              >
                <Globe className={`w-3.5 h-3.5 ${searchEnabled ? 'text-white' : 'text-slate-400'}`} />
                <span>Web Search {searchEnabled ? 'ON' : 'OFF'}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    searchEnabled
                      ? 'bg-white/20 text-white'
                      : isSearchNearLimit
                      ? 'bg-orange-100 text-orange-800 border border-orange-300'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {searchCount}/{maxSearchLimit}
                </span>
              </button>
            </div>

            {/* Right: Send Button matching the circular action buttons in the reference */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSend}
                disabled={!text.trim() || isLoading}
                className={`flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all cursor-pointer ${
                  !text.trim() || isLoading
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-teal-500 hover:bg-teal-600 text-white shadow-teal-500/30 active:scale-95'
                }`}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Routing...</span>
                  </>
                ) : (
                  <>
                    <span>Send</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Keyboard shortcut info */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
          <span>Press <strong className="text-slate-700">Enter</strong> to send, <strong className="text-slate-700">Shift + Enter</strong> for new line</span>
          <span className="text-teal-800/80 font-medium">Independent API keys • $0 MVP free tier on Gemini</span>
        </div>
      </div>
    </div>
  );
};
