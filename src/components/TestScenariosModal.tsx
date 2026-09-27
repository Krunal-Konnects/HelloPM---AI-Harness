import React from 'react';
import {
  X,
  Play,
  Flame,
} from 'lucide-react';
import { HarnessSession } from '../types';

interface TestScenariosModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: HarnessSession;
  onRunTest: (testId: number) => void;
}

export const TestScenariosModal: React.FC<TestScenariosModalProps> = ({
  isOpen,
  onClose,
  session: _session,
  onRunTest,
}) => {
  if (!isOpen) return null;

  const tests = [
    {
      id: 1,
      title: 'Test 1: Basic Chat & Execution',
      desc: 'Verify basic prompt submission, response delivery, and cost accounting ($0.00 on Free Gemini or ~$0.001 on Claude).',
      prompt: 'Say hello and confirm you are the AI Harness Orchestrator ready for multi-provider routing.',
      expected: 'Greeting + exact token count + cost displayed',
      category: 'Core',
    },
    {
      id: 2,
      title: 'Test 2: Document RAG & Citations',
      desc: 'Load Q3 Report, search marketing spend, verify [Chunk 2] retrieval and explicit chunk citation.',
      prompt: 'What was our marketing spend in Q3 and which campaigns generated the impressions? Cite your sources.',
      expected: 'Extracts Campaign A ($50K) and Campaign B ($30K) with [From Q3 Report - Chunk 2] citation',
      category: 'RAG',
    },
    {
      id: 3,
      title: 'Test 3: Multi-Model Switching',
      desc: 'Explicitly switch routing to GPT-4o or Claude and verify multi-provider execution.',
      prompt: 'Use GPT to explain embeddings and vector similarity for enterprise knowledge bases.',
      expected: 'Switches provider target and returns response tagged with GPT-4o',
      category: 'Routing',
    },
    {
      id: 4,
      title: 'Test 4: Gmail Workflow Integration',
      desc: 'Connect Gmail inbox, load high-priority email into context, generate professional draft, and prepare to send.',
      prompt: 'Based on the Q3 Financial Review email from Sarah, draft a professional and concise executive reply.',
      expected: 'Generates structured email draft with [Edit Draft] and [Send via Gmail] controls',
      category: 'Gmail',
    },
    {
      id: 5,
      title: 'Test 5: Web Search (Free Tavily Tier)',
      desc: 'Enable real-time search, extract web sources, inject results into LLM, and increment search counter.',
      prompt: "What's trending in AI agent architecture and multi-model routing this week? Search the web.",
      expected: 'Live or verified sandbox web sources + increments search counter (e.g. 13 of 1,000)',
      category: 'Search',
    },
    {
      id: 6,
      title: 'Test 6: Session Persistence & Restore',
      desc: 'Verify that chat messages, indexed documents, and cumulative costs survive browser refresh.',
      prompt: 'Inspect current session memory and verify state persistence.',
      expected: 'Session restored banner with timestamp, 100% messages and documents preserved',
      category: 'Persistence',
    },
    {
      id: 7,
      title: 'Test 7: Error Handling Matrix (Part 8)',
      desc: 'Test gracefully translated errors without raw crash traces: missing API key, file too large, invalid credentials.',
      prompt: 'Use Grok to calculate orbital trajectories (triggers friendly missing key prompt if no xAI key provided)',
      expected: 'Translates to plain English error with 1-click recovery button',
      category: 'Resilience',
    },
    {
      id: 8,
      title: 'Test 8: Cost Accuracy & Token Metering',
      desc: 'Verify that calculated cost matches exact mathematical formula: (tokens / 1000) * provider rate within $0.001.',
      prompt: 'Calculate exact token economics for a 5,000 token prompt under Claude Opus versus GPT-4o.',
      expected: 'Exact token metering and accurate dollar calculation in header badge',
      category: 'Economics',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white border border-teal-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-teal-100/80 flex items-center justify-between bg-white/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-600 shadow-xs">
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Part 9 Test Scenarios Suite</h2>
              <p className="text-[11px] text-teal-800/80">
                8 automated/guided benchmarks from the system specification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-teal-800 hover:bg-teal-50 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Test List */}
        <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
          {tests.map((test) => (
            <div
              key={test.id}
              className="p-4 rounded-2xl bg-white border border-teal-100/90 hover:border-teal-300 transition-all space-y-2.5 shadow-sm shadow-teal-950/5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{test.title}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200/80">
                      {test.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{test.desc}</p>
                </div>

                <button
                  onClick={() => {
                    onRunTest(test.id);
                    onClose();
                  }}
                  className="px-4 py-2 rounded-full bg-teal-500 hover:bg-teal-600 text-white font-semibold text-xs shrink-0 cursor-pointer shadow-md shadow-teal-500/25 flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>Execute Test</span>
                </button>
              </div>

              <div className="p-3 rounded-xl bg-teal-50/30 border border-teal-100 text-[11px] space-y-1.5">
                <div className="text-slate-600">
                  <strong className="text-slate-800 font-semibold">Prompt:</strong> "{test.prompt}"
                </div>
                <div className="text-teal-800 font-medium">
                  <strong className="text-teal-950 font-bold">Expected:</strong> {test.expected}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-teal-100/80 bg-white flex items-center justify-between text-xs text-slate-500">
          <span>All 8 scenarios conform to Part 9 validation rules</span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer shadow-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
