import React from 'react';
import { X, Coins, ShieldCheck } from 'lucide-react';
import { SessionCosts } from '../types';
import { AVAILABLE_MODELS, formatCost } from '../utils/costCalculator';

interface CostModalProps {
  isOpen: boolean;
  onClose: () => void;
  costs: SessionCosts;
}

export const CostModal: React.FC<CostModalProps> = ({ isOpen, onClose, costs }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white border border-teal-100 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-teal-100/80 flex items-center justify-between bg-white/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-600 shadow-xs">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Cost & Token Accounting</h2>
              <p className="text-[11px] text-teal-800/80">
                Transparent real-time expenditure tracking with $0 MVP baseline
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Main Metric Cards */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-50/70 to-amber-50/50 border border-orange-200/80 space-y-1 shadow-xs">
              <div className="text-[11px] text-orange-900 font-semibold">Total Session Cost</div>
              <div className="text-2xl font-black text-orange-950">
                {formatCost(costs.total)}
              </div>
              <div className="text-[10px] text-orange-800/70">Based on exact token metering</div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-teal-50/80 to-emerald-50/50 border border-teal-200/80 space-y-1 shadow-xs">
              <div className="text-[11px] text-teal-900 font-semibold">Total Tokens Processed</div>
              <div className="text-2xl font-black text-teal-950">
                {costs.totalTokens.toLocaleString()}
              </div>
              <div className="text-[10px] text-teal-800/70">Combined input + output context</div>
            </div>
          </div>

          {/* MVP Free Tier Guarantee Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/80 text-teal-950 space-y-1.5 shadow-xs">
            <div className="flex items-center gap-1.5 font-bold text-teal-950 text-xs">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Zero-Cost MVP Operational Guarantee</span>
            </div>
            <p className="text-[11px] leading-relaxed text-teal-900/90">
              When using <strong>Gemini 3.8 Flash</strong> and <strong>Tavily Search Free Tier</strong>, your operating cost is strictly <strong>$0.00</strong>. You only incur costs when providing your own independent Anthropic or OpenAI API keys.
            </p>
          </div>

          {/* Model Breakdown */}
          <div className="space-y-2">
            <h3 className="font-bold uppercase tracking-wider text-teal-900 text-[11px]">
              Expenditure by Model
            </h3>
            <div className="space-y-2">
              {AVAILABLE_MODELS.map((model) => {
                const modelUsage = costs.byModel[model.id] || { cost: 0, tokens: 0, calls: 0 };

                return (
                  <div
                    key={model.id}
                    className="p-3.5 rounded-2xl bg-white border border-teal-100 shadow-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span>{model.name}</span>
                        {model.isFree && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                            $0 Free Tier
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {modelUsage.calls} request(s) • {modelUsage.tokens.toLocaleString()} tokens
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-900">
                        {formatCost(modelUsage.cost, model.isFree)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {model.isFree
                          ? '15K free reqs/mo'
                          : `$${model.inputCostPer1k}/1k in, $${model.outputCostPer1k}/1k out`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pricing Reference Matrix (Part 6) */}
          <div className="pt-2 border-t border-teal-100 space-y-2">
            <h3 className="font-bold uppercase tracking-wider text-teal-900 text-[11px]">
              Provider Pricing Reference Table
            </h3>
            <div className="overflow-x-auto rounded-2xl border border-teal-100 shadow-xs">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-teal-50/50 text-teal-900 border-b border-teal-100 font-semibold">
                  <tr>
                    <th className="p-2.5">Provider / Service</th>
                    <th className="p-2.5">Free Tier</th>
                    <th className="p-2.5">Input / 1K</th>
                    <th className="p-2.5">Output / 1K</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-teal-50 text-slate-700 bg-white">
                  <tr>
                    <td className="p-2.5 font-semibold">Google Gemini</td>
                    <td className="p-2.5 text-teal-700 font-bold">15,000 reqs/mo</td>
                    <td className="p-2.5 text-teal-700 font-bold">$0.00</td>
                    <td className="p-2.5 text-teal-700 font-bold">$0.00</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">Claude Opus 5.5</td>
                    <td className="p-2.5 text-slate-500">User API Key</td>
                    <td className="p-2.5">$0.003</td>
                    <td className="p-2.5">$0.015</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">OpenAI GPT-4o</td>
                    <td className="p-2.5 text-slate-500">User API Key</td>
                    <td className="p-2.5">$0.005</td>
                    <td className="p-2.5">$0.015</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">xAI Grok-2</td>
                    <td className="p-2.5 text-slate-500">User API Key</td>
                    <td className="p-2.5">$0.005</td>
                    <td className="p-2.5">$0.015</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">Tavily Web Search</td>
                    <td className="p-2.5 text-teal-700 font-bold">1,000 searches/mo</td>
                    <td className="p-2.5 text-teal-700 font-bold">$0.00</td>
                    <td className="p-2.5 text-teal-700 font-bold">$0.00</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-semibold">Gmail (IMAP / Session)</td>
                    <td className="p-2.5 text-teal-700 font-bold">Unlimited</td>
                    <td className="p-2.5 text-teal-700 font-bold">$0.00</td>
                    <td className="p-2.5 text-teal-700 font-bold">$0.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-teal-100/80 bg-white flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold cursor-pointer shadow-md shadow-teal-500/25 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
