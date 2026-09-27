import React, { useState } from 'react';
import {
  Mail,
  X,
  CheckCircle,
  Inbox,
  Send,
  Sparkles,
  LogOut,
  Star,
  ArrowRight,
} from 'lucide-react';
import { EmailItem } from '../types';

interface GmailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  userEmail: string;
  onConnect: () => void;
  onDisconnect: () => void;
  emails: EmailItem[];
  onLoadIntoChat: (email: EmailItem) => void;
  onSendEmail: (email: { to: string; subject: string; body: string }) => Promise<void>;
}

export const GmailDrawer: React.FC<GmailDrawerProps> = ({
  isOpen,
  onClose,
  isConnected,
  userEmail,
  onConnect,
  onDisconnect,
  emails,
  onLoadIntoChat,
  onSendEmail,
}) => {
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [tab, setTab] = useState<'inbox' | 'compose'>('inbox');
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSendCompose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo || !composeSubject) return;
    setIsSending(true);
    try {
      await onSendEmail({
        to: composeTo,
        subject: composeSubject,
        body: composeBody,
      });
      setSendSuccess(true);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setTimeout(() => {
        setSendSuccess(false);
        setTab('inbox');
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white border-l border-teal-100 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-teal-100/80 flex items-center justify-between bg-white/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 border border-teal-200/80 flex items-center justify-center text-teal-600 shadow-xs">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Gmail Integration (Simplified)</h2>
              <p className="text-[11px] text-teal-800/80">
                Read inbox threads, auto-draft responses, and send via Gmail
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!isConnected ? (
            <div className="py-12 px-6 text-center space-y-5 bg-gradient-to-b from-teal-50/40 to-white rounded-3xl border border-teal-200/80">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-white border border-teal-200 shadow-md shadow-teal-500/10 flex items-center justify-center text-teal-600">
                <Mail className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">Connect Your Gmail Account</h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  One-click authorization. Allows the AI Harness Orchestrator to load email threads into context and draft professional replies.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={onConnect}
                  className="px-6 py-2.5 rounded-full bg-teal-500 hover:bg-teal-600 text-white font-semibold text-xs transition-all shadow-md shadow-teal-500/25 active:scale-95 cursor-pointer flex items-center gap-2 mx-auto"
                >
                  <Mail className="w-4 h-4" />
                  <span>Connect Gmail (One-Click Auth)</span>
                </button>
              </div>

              <div className="text-[11px] text-teal-800/80">
                Uses session auth token • No complex multi-stage OAuth setup required • $0 Free tier
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Account status header */}
              <div className="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse ring-2 ring-emerald-200" />
                  <div>
                    <div className="text-xs font-bold text-slate-800">{userEmail}</div>
                    <div className="text-[10px] text-teal-700 font-semibold">Connected & Authorized</div>
                  </div>
                </div>

                <button
                  onClick={onDisconnect}
                  className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-600 px-2.5 py-1 rounded-full hover:bg-white border border-transparent hover:border-slate-200 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Disconnect</span>
                </button>
              </div>

              {/* Sub tabs */}
              <div className="flex border-b border-teal-100 text-xs">
                <button
                  onClick={() => {
                    setTab('inbox');
                    setSelectedEmail(null);
                  }}
                  className={`pb-2.5 px-4 font-bold transition-all cursor-pointer border-b-2 ${
                    tab === 'inbox'
                      ? 'border-teal-500 text-teal-800'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Inbox Threads ({emails.length})
                </button>
                <button
                  onClick={() => setTab('compose')}
                  className={`pb-2.5 px-4 font-bold transition-all cursor-pointer border-b-2 ${
                    tab === 'compose'
                      ? 'border-teal-500 text-teal-800'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Compose / Send
                </button>
              </div>

              {/* Tab: Compose */}
              {tab === 'compose' && (
                <form onSubmit={handleSendCompose} className="space-y-3.5 bg-white p-4 rounded-2xl border border-teal-100 shadow-xs">
                  {sendSuccess && (
                    <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-teal-600" />
                      <span>Email sent successfully and recorded in session!</span>
                    </div>
                  )}

                  <div>
                    <label className="text-[11px] uppercase font-bold text-slate-600 block mb-1">To:</label>
                    <input
                      type="email"
                      required
                      placeholder="colleague@company.com"
                      value={composeTo}
                      onChange={(e) => setComposeTo(e.target.value)}
                      className="w-full bg-slate-50/50 border border-teal-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-400/20"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] uppercase font-bold text-slate-600 block mb-1">Subject:</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Q3 Summary and Action Items"
                      value={composeSubject}
                      onChange={(e) => setComposeSubject(e.target.value)}
                      className="w-full bg-slate-50/50 border border-teal-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-400/20"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] uppercase font-bold text-slate-600 block mb-1">Body:</label>
                    <textarea
                      rows={5}
                      required
                      placeholder="Write your email or let AI draft it in the main chat..."
                      value={composeBody}
                      onChange={(e) => setComposeBody(e.target.value)}
                      className="w-full bg-slate-50/50 border border-teal-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-400/20 resize-none font-sans"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSending}
                    className="w-full py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-full text-xs font-semibold cursor-pointer shadow-md shadow-teal-500/25 flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSending ? 'Sending...' : 'Send Email'}</span>
                  </button>
                </form>
              )}

              {/* Tab: Inbox List */}
              {tab === 'inbox' && (
                <div className="space-y-2">
                  {selectedEmail ? (
                    <div className="p-4 rounded-2xl bg-white border border-teal-100 shadow-xs space-y-3.5">
                      <button
                        onClick={() => setSelectedEmail(null)}
                        className="text-xs text-teal-700 hover:text-teal-900 cursor-pointer flex items-center gap-1 font-semibold"
                      >
                        ← Back to Inbox
                      </button>

                      <div className="border-b border-teal-50 pb-3 space-y-1">
                        <div className="text-sm font-bold text-slate-900">{selectedEmail.subject}</div>
                        <div className="text-xs text-slate-500">
                          <strong className="text-slate-800">From:</strong> {selectedEmail.from}
                        </div>
                        <div className="text-[11px] text-slate-400">{selectedEmail.date}</div>
                      </div>

                      <div className="text-xs text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
                        {selectedEmail.body}
                      </div>

                      <div className="pt-3 border-t border-teal-50 flex items-center gap-2">
                        <button
                          onClick={() => {
                            onLoadIntoChat(selectedEmail);
                            onClose();
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold cursor-pointer shadow-md shadow-teal-500/25 transition-all"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Load into Chat Context</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    emails.map((email) => (
                      <div
                        key={email.id}
                        className="p-3.5 rounded-2xl bg-white hover:bg-teal-50/30 border border-teal-100 shadow-xs transition-all cursor-pointer space-y-2"
                        onClick={() => setSelectedEmail(email)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {email.starred ? (
                              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                            ) : (
                              <Inbox className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            )}
                            <span className="text-xs font-bold text-slate-800 line-clamp-1">
                              {email.from}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0 font-medium">{email.date}</span>
                        </div>

                        <div className="text-xs font-semibold text-slate-800 line-clamp-1">
                          {email.subject}
                        </div>

                        <div className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {email.snippet}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-teal-700 font-semibold">
                            Click to view full thread
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onLoadIntoChat(email);
                              onClose();
                            }}
                            className="px-3 py-1 rounded-full bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors border border-teal-200/80"
                          >
                            <Sparkles className="w-3 h-3 text-teal-600" />
                            <span>Load into Chat</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
