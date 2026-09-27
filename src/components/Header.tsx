import React from 'react';
import {
  Cpu,
  Coins,
  FileText,
  Mail,
  Sparkles,
  Download,
  RotateCcw,
  CheckCircle2,
  WifiOff,
  Flame,
  Sliders,
} from 'lucide-react';
import { ModelId, HarnessSession } from '../types';
import { AVAILABLE_MODELS, formatCost } from '../utils/costCalculator';

interface HeaderProps {
  session: HarnessSession;
  onSelectModel: (model: ModelId) => void;
  onOpenDocuments: () => void;
  onOpenGmail: () => void;
  onOpenSettings: () => void;
  onOpenCosts: () => void;
  onOpenTests: () => void;
  onExport: () => void;
  onReset: () => void;
  isOnline: boolean;
  restoredNotice: string | null;
  onDismissRestoredNotice: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  onSelectModel,
  onOpenDocuments,
  onOpenGmail,
  onOpenSettings,
  onOpenCosts,
  onOpenTests,
  onExport,
  onReset,
  isOnline,
  restoredNotice,
  onDismissRestoredNotice,
}) => {
  const currentModel = AVAILABLE_MODELS.find((m) => m.id === session.selectedModel) || AVAILABLE_MODELS[0];

  return (
    <header className="border-b border-teal-100/80 bg-white/90 backdrop-blur-md sticky top-0 z-30 shadow-xs">
      {/* Restored Session Notification Banner */}
      {restoredNotice && (
        <div className="bg-teal-50/90 border-b border-teal-200/80 px-4 py-1.5 text-xs text-teal-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            <span>
              <strong>Session restored.</strong> Last activity: {restoredNotice}. All conversation history, documents, and costs are preserved.
            </span>
          </div>
          <button
            onClick={onDismissRestoredNotice}
            className="text-teal-700 hover:text-teal-900 font-semibold text-xs px-2 py-0.5 rounded cursor-pointer transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Offline Alert */}
      {!isOnline && (
        <div className="bg-rose-50 border-b border-rose-200 px-4 py-1.5 text-xs text-rose-800 flex items-center gap-2">
          <WifiOff className="w-3.5 h-3.5 text-rose-600" />
          <span>No internet connection detected. Offline requests will automatically retry when reconnected.</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
        {/* Left: Branding & Model selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-500 via-teal-400 to-cyan-400 p-0.5 shadow-sm shadow-teal-500/25 flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center shadow-inner">
                <Cpu className="w-5 h-5 text-teal-600" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-tight text-slate-800">AI Harness</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200/80 shadow-xs">
                  Orchestrator
                </span>
              </div>
              <div className="text-[11px] text-teal-800/80 flex items-center gap-1.5 font-medium">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                <span>Multi-Model RAG & Routing</span>
              </div>
            </div>
          </div>

          <div className="hidden sm:block h-6 w-px bg-teal-100" />

          {/* Model Selector Dropdown styled like modern pill */}
          <div className="relative group">
            <select
              value={session.selectedModel}
              onChange={(e) => onSelectModel(e.target.value as ModelId)}
              className="bg-teal-50/70 hover:bg-teal-50 border border-teal-200/80 text-teal-950 text-xs rounded-xl px-3.5 py-1.5 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white cursor-pointer transition-all font-semibold shadow-xs"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id} className="bg-white text-slate-800">
                  {m.name} {m.isFree ? '(Free Tier)' : ''}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-teal-600">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Right: Actions & Badges */}
        <div className="flex items-center gap-2">
          {/* Cost Badge Button */}
          <button
            onClick={onOpenCosts}
            title="View Cost & Token accounting"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-teal-50/60 border border-teal-200/80 text-xs text-slate-700 transition-all cursor-pointer group shadow-xs hover:border-teal-300"
          >
            <Coins className="w-3.5 h-3.5 text-teal-600 group-hover:scale-110 transition-transform" />
            <span className="font-bold text-teal-950">{formatCost(session.costs.total)}</span>
            <span className="text-[11px] text-slate-500 font-medium">| {session.costs.totalTokens.toLocaleString()} tkn</span>
          </button>

          {/* Documents Pill */}
          <button
            onClick={onOpenDocuments}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all cursor-pointer shadow-xs ${
              session.documents.length > 0
                ? 'bg-teal-500 border-teal-500 text-white font-semibold shadow-sm shadow-teal-500/25 hover:bg-teal-600'
                : 'bg-white border-teal-100/90 text-slate-700 hover:bg-teal-50/50 hover:border-teal-200'
            }`}
            title="Documents (RAG)"
          >
            <FileText className={`w-3.5 h-3.5 ${session.documents.length > 0 ? 'text-white' : 'text-teal-600'}`} />
            <span className="hidden md:inline font-medium">Documents</span>
            {session.documents.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-bold">
                {session.documents.length}
              </span>
            )}
          </button>

          {/* Gmail Pill */}
          <button
            onClick={onOpenGmail}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all cursor-pointer shadow-xs ${
              session.gmailConnected
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-semibold'
                : 'bg-white border-teal-100/90 text-slate-700 hover:bg-teal-50/50 hover:border-teal-200'
            }`}
            title="Gmail integration"
          >
            <Mail className="w-3.5 h-3.5 text-teal-600" />
            <span className="hidden md:inline font-medium">Gmail</span>
            {session.gmailConnected ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
            ) : (
              <span className="text-[10px] text-teal-700 font-semibold">Connect</span>
            )}
          </button>

          {/* Test Scenarios Quick Runner with warm peach/coral highlight */}
          <button
            onClick={onOpenTests}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100/80 border border-orange-200/80 text-orange-900 text-xs font-semibold cursor-pointer transition-all shadow-xs"
            title="Run prompt test suite (Tests 1-8)"
          >
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span className="hidden md:inline">Test Suite</span>
          </button>

          {/* Settings */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-white hover:bg-teal-50/70 border border-teal-100/90 text-slate-600 hover:text-teal-700 transition-colors cursor-pointer shadow-xs"
            title="API Keys & Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* Export session */}
          <button
            onClick={onExport}
            className="hidden sm:flex p-2 rounded-xl bg-white hover:bg-teal-50/70 border border-teal-100/90 text-slate-600 hover:text-teal-700 transition-colors cursor-pointer shadow-xs"
            title="Export session"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Reset session */}
          <button
            onClick={onReset}
            className="hidden sm:flex p-2 rounded-xl bg-white hover:bg-rose-50 border border-teal-100/90 hover:border-rose-200 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer shadow-xs"
            title="Reset session"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
