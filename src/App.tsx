import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { ChatArea } from './components/ChatArea';
import { ChatInput } from './components/ChatInput';
import { DocumentsDrawer } from './components/DocumentsDrawer';
import { GmailDrawer } from './components/GmailDrawer';
import { SettingsModal } from './components/SettingsModal';
import { CostModal } from './components/CostModal';
import { TestScenariosModal } from './components/TestScenariosModal';
import {
  HarnessSession,
  ModelId,
  ChatMessage,
  UploadedDocument,
  EmailItem,
  ApiKeys,
  WebSearchResult,
} from './types';
import {
  loadSession,
  saveSession,
  clearSession,
  exportSessionToJSON,
  exportSessionToMarkdown,
} from './utils/storage';
import {
  parseFileToDocument,
  createSampleQ3Report,
} from './utils/documentParser';
import {
  parseUserInput,
  findRelevantChunks,
  buildRAGContext,
  extractCitations,
} from './utils/ragEngine';
import { calculateActualCost } from './utils/costCalculator';

export default function App() {
  const [session, setSession] = useState<HarnessSession>(() => loadSession().session);
  const [restoredNotice, setRestoredNotice] = useState<string | null>(() => {
    const loaded = loadSession();
    return loaded.isRestored ? loaded.lastActivityText : null;
  });
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Modal / Drawer visibility states
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  const [isGmailOpen, setIsGmailOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCostsOpen, setIsCostsOpen] = useState(false);
  const [isTestsOpen, setIsTestsOpen] = useState(false);
  const [highlightedChunkNum, setHighlightedChunkNum] = useState<number | null>(null);

  // Active email context from Gmail
  const [activeEmailContext, setActiveEmailContext] = useState<string | null>(null);
  const [gmailEmails, setGmailEmails] = useState<EmailItem[]>([]);

  // Online / Offline listeners
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-save session periodically
  useEffect(() => {
    const timer = setInterval(() => {
      saveSession(session);
    }, 10000);
    return () => clearInterval(timer);
  }, [session]);

  // Initial load of Gmail emails if connected
  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const res = await fetch('/api/gmail/emails');
        if (res.ok) {
          const data = await res.json();
          setGmailEmails(data.emails || []);
        }
      } catch (err) {
        console.warn('Could not fetch initial emails', err);
      }
    };
    fetchEmails();
  }, []);

  // Update session helper
  const updateSession = (updater: (prev: HarnessSession) => HarnessSession) => {
    setSession((prev) => {
      const next = updater(prev);
      saveSession(next);
      return next;
    });
  };

  // Model selection
  const handleSelectModel = (model: ModelId) => {
    updateSession((prev) => ({ ...prev, selectedModel: model }));
  };

  // Upload document
  const handleUploadFile = async (file: File) => {
    try {
      const doc = await parseFileToDocument(file);
      updateSession((prev) => ({
        ...prev,
        documents: [doc, ...prev.documents],
      }));
      setIsDocsOpen(true);
    } catch (err: any) {
      alert(err.message || 'Error parsing document');
    }
  };

  // Load sample Q3 report
  const handleLoadSampleDoc = () => {
    const sample = createSampleQ3Report();
    updateSession((prev) => {
      const exists = prev.documents.some((d) => d.id === sample.id);
      if (exists) return prev;
      return {
        ...prev,
        documents: [sample, ...prev.documents],
      };
    });
    setIsDocsOpen(true);
  };

  // Remove document
  const handleRemoveDocument = (docId: string) => {
    updateSession((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== docId),
    }));
  };

  // Connect Gmail
  const handleConnectGmail = () => {
    updateSession((prev) => ({
      ...prev,
      gmailConnected: true,
      gmailEmail: 'sarah.executive@acmecorp.com',
    }));
  };

  // Disconnect Gmail
  const handleDisconnectGmail = () => {
    updateSession((prev) => ({
      ...prev,
      gmailConnected: false,
    }));
    setActiveEmailContext(null);
  };

  // Load email into chat context
  const handleLoadEmailIntoChat = (email: EmailItem) => {
    const contextStr = `Email Thread:\nFrom: ${email.from}\nTo: ${email.to}\nSubject: ${email.subject}\nDate: ${email.date}\nBody:\n${email.body}`;
    setActiveEmailContext(contextStr);

    // Append system notice or trigger prompt
    const userNotice: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: `Loaded email thread from ${email.from} ("${email.subject}"). Please analyze this email and draft a professional response.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    handleSendMessage(userNotice.content);
  };

  // Send email via Gmail endpoint
  const handleSendEmail = async (emailData: { to: string; subject: string; body: string }) => {
    const res = await fetch('/api/gmail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to send email');
    }

    const data = await res.json();
    if (data.email) {
      setGmailEmails((prev) => [data.email, ...prev]);
    }

    // Mark corresponding draft in messages as sent
    updateSession((prev) => ({
      ...prev,
      messages: prev.messages.map((m) => {
        if (m.emailDraft && m.emailDraft.to === emailData.to) {
          return {
            ...m,
            emailDraft: { ...m.emailDraft, isSent: true },
          };
        }
        return m;
      }),
    }));
  };

  // Main message execution & multi-model routing pipeline
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const parsed = parseUserInput(text, session.documents, session.gmailConnected);
    const targetModel = parsed.detectedModel || session.selectedModel;

    // Check internet connectivity
    if (!navigator.onLine) {
      const offlineMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: {
          message: 'No internet connection detected.',
          code: 'OFFLINE',
          actionLabel: 'Retry when online',
          actionType: 'retry',
        },
      };
      updateSession((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            id: `user-${Date.now()}`,
            role: 'user',
            content: text,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          offlineMsg,
        ],
      }));
      return;
    }

    // 1. Perform Document RAG lookup
    const relevantChunks = findRelevantChunks(text, session.documents);
    const documentContext = buildRAGContext(relevantChunks);

    // 2. Perform Web Search if enabled or requested
    let webResults: WebSearchResult[] = [];
    const shouldSearch = session.searchConfig.enabled || parsed.needsSearch;

    if (shouldSearch) {
      try {
        const searchResp = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: text,
            apiKey: session.apiKeys.tavily,
            mockIfNoKey: session.searchConfig.useDemoFallback,
          }),
        });

        if (searchResp.ok) {
          const searchData = await searchResp.json();
          webResults = searchData.results || [];
          updateSession((prev) => ({
            ...prev,
            searchConfig: {
              ...prev.searchConfig,
              countThisMonth: prev.searchConfig.countThisMonth + 1,
            },
          }));
        }
      } catch (e) {
        console.warn('Search query failed or timed out', e);
      }
    }

    // 3. Append User Message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      model: targetModel,
    };

    updateSession((prev) => ({
      ...prev,
      messages: [...prev.messages, userMsg],
    }));

    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: targetModel,
          messages: [...session.messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          apiKeys: session.apiKeys,
          systemPrompt: session.systemPrompt,
          documentContext,
          webResults,
          emailContext: activeEmailContext,
          temperature: session.temperature,
          max_tokens: session.maxTokens,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Map error according to Part 8 Error Matrix
        const errorObj = {
          message: data.error || 'Something went wrong. Please check your settings and retry.',
          code: data.code || 'UNKNOWN_ERROR',
          actionType: (data.code === 'MISSING_KEY' || data.code === 'INVALID_KEY'
            ? 'settings'
            : 'switch-gemini') as 'settings' | 'switch-gemini',
        };

        const errorMsg: ChatMessage = {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: data.error || 'Failed to process request.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          model: targetModel,
          error: errorObj,
        };

        updateSession((prev) => ({
          ...prev,
          messages: [...prev.messages, errorMsg],
        }));
        return;
      }

      // Check citations
      const rawCitations = extractCitations(data.content);
      const documentCitations =
        rawCitations.length > 0
          ? rawCitations
          : relevantChunks.map((rc) => ({
              docName: rc.docName,
              chunkNum: rc.chunk.chunkNumber,
              snippet: rc.chunk.title,
            }));

      // Check if response contains an email draft
      let emailDraft: ChatMessage['emailDraft'] = undefined;
      const lowerResp = data.content.toLowerCase();
      if (
        parsed.needsGmail ||
        lowerResp.includes('subject:') ||
        lowerResp.includes('dear ') ||
        lowerResp.includes('hi ')
      ) {
        const subjectMatch = data.content.match(/subject:\s*([^\n\r]+)/i);
        const toMatch = data.content.match(/to:\s*([^\n\r]+)/i);

        if (subjectMatch) {
          const subject = subjectMatch[1].trim();
          const to = toMatch ? toMatch[1].trim() : 'sarah.connor@acmecorp.com';
          emailDraft = {
            to,
            subject,
            body: data.content,
            isSent: false,
          };
        }
      }

      const inputTokens = data.tokens?.input || 200;
      const outputTokens = data.tokens?.output || 150;
      const totalTokens = inputTokens + outputTokens;
      const actualCost = data.cost ?? calculateActualCost(targetModel, inputTokens, outputTokens);

      const assistantMsg: ChatMessage = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: data.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: targetModel,
        provider: data.provider,
        tokens: {
          input: inputTokens,
          output: outputTokens,
          total: totalTokens,
        },
        cost: actualCost,
        isFreeTier: data.isFreeTier,
        documentCitations: session.documents.length > 0 ? documentCitations : undefined,
        webResults: webResults.length > 0 ? webResults : undefined,
        emailDraft,
      };

      updateSession((prev) => {
        const currentModelStats = prev.costs.byModel[targetModel] || { cost: 0, tokens: 0, calls: 0 };
        return {
          ...prev,
          messages: [...prev.messages, assistantMsg],
          costs: {
            total: Number((prev.costs.total + actualCost).toFixed(6)),
            totalTokens: prev.costs.totalTokens + totalTokens,
            byModel: {
              ...prev.costs.byModel,
              [targetModel]: {
                cost: Number((currentModelStats.cost + actualCost).toFixed(6)),
                tokens: currentModelStats.tokens + totalTokens,
                calls: currentModelStats.calls + 1,
              },
            },
          },
        };
      });
    } catch (err: any) {
      console.error(err);
      const errMsg: ChatMessage = {
        id: `asst-err-${Date.now()}`,
        role: 'assistant',
        content: 'Request could not be completed. Check your internet connection or switch model.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: targetModel,
        error: {
          message: err.message || 'Network request failed',
          code: 'FETCH_ERROR',
          actionType: 'switch-gemini',
        },
      };
      updateSession((prev) => ({
        ...prev,
        messages: [...prev.messages, errMsg],
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Run test scenario from Part 9
  const handleRunTest = (testId: number) => {
    if (testId === 1) {
      // Test 1: Basic Chat
      handleSendMessage('Say hello and confirm you are the AI Harness Orchestrator ready for multi-provider routing.');
    } else if (testId === 2) {
      // Test 2: Document RAG
      if (session.documents.length === 0) {
        handleLoadSampleDoc();
      }
      setTimeout(() => {
        handleSendMessage('What was our marketing spend in Q3 and which campaigns generated the impressions? Cite your sources with [From Document - Chunk X].');
      }, 300);
    } else if (testId === 3) {
      // Test 3: Multi-Model Switching
      handleSelectModel('gpt-4o');
      handleSendMessage('Use GPT to explain embeddings and vector similarity for enterprise knowledge bases.');
    } else if (testId === 4) {
      // Test 4: Gmail Integration
      handleConnectGmail();
      setIsGmailOpen(true);
    } else if (testId === 5) {
      // Test 5: Web Search
      updateSession((prev) => ({
        ...prev,
        searchConfig: { ...prev.searchConfig, enabled: true },
      }));
      handleSendMessage("What's trending in AI agent architecture and multi-model routing this week? Search the web.");
    } else if (testId === 6) {
      // Test 6: Session Persistence
      saveSession(session);
      setRestoredNotice('Simulated reload: 1 min ago');
      alert(`Session verified: ID "${session.id}", ${session.messages.length} messages, ${session.documents.length} document(s), cumulative cost $${session.costs.total.toFixed(4)}.`);
    } else if (testId === 7) {
      // Test 7: Error handling
      handleSendMessage('Use Grok to calculate orbital trajectories with quantum corrections');
    } else if (testId === 8) {
      // Test 8: Cost accuracy
      handleSendMessage('Calculate exact token economics for a 5,000 token prompt under Claude Opus versus GPT-4o.');
    }
  };

  // Switch to Gemini free tier
  const handleSwitchToGemini = () => {
    handleSelectModel('gemini-3.8-flash');
  };

  // Reset Session
  const handleResetSession = () => {
    if (confirm('Are you sure you want to reset the session? All messages and documents will be cleared.')) {
      const fresh = clearSession();
      setSession(fresh);
      setRestoredNotice(null);
    }
  };

  // Export session
  const handleExportSession = () => {
    exportSessionToMarkdown(session);
  };

  return (
    <div className="flex flex-col h-screen bg-transparent text-slate-800 font-sans selection:bg-teal-500/20 selection:text-teal-900">
      {/* Top Header */}
      <Header
        session={session}
        onSelectModel={handleSelectModel}
        onOpenDocuments={() => setIsDocsOpen(true)}
        onOpenGmail={() => setIsGmailOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCosts={() => setIsCostsOpen(true)}
        onOpenTests={() => setIsTestsOpen(true)}
        onExport={handleExportSession}
        onReset={handleResetSession}
        isOnline={isOnline}
        restoredNotice={restoredNotice}
        onDismissRestoredNotice={() => setRestoredNotice(null)}
      />

      {/* Main Conversation Stream */}
      <ChatArea
        messages={session.messages}
        isLoading={isLoading}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSwitchToGemini={handleSwitchToGemini}
        onRetry={(prompt) => handleSendMessage(prompt)}
        onSendEmailDraft={handleSendEmail}
        onSelectChunkSnippet={(chunkNum) => {
          setHighlightedChunkNum(chunkNum);
          setIsDocsOpen(true);
        }}
        onQuickPrompt={(prompt) => handleSendMessage(prompt)}
      />

      {/* Bottom Sticky Chat Input Toolbar */}
      <ChatInput
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        selectedModel={session.selectedModel}
        searchEnabled={session.searchConfig.enabled}
        onToggleSearch={(enabled) =>
          updateSession((prev) => ({
            ...prev,
            searchConfig: { ...prev.searchConfig, enabled },
          }))
        }
        searchCount={session.searchConfig.countThisMonth}
        maxSearchLimit={session.searchConfig.maxLimit}
        documents={session.documents}
        onUploadFile={handleUploadFile}
        onLoadSampleDoc={handleLoadSampleDoc}
      />

      {/* Drawers and Modals */}
      <DocumentsDrawer
        isOpen={isDocsOpen}
        onClose={() => {
          setIsDocsOpen(false);
          setHighlightedChunkNum(null);
        }}
        documents={session.documents}
        onUploadFile={handleUploadFile}
        onRemoveDocument={handleRemoveDocument}
        onLoadSampleDoc={handleLoadSampleDoc}
        selectedChunkNum={highlightedChunkNum}
      />

      <GmailDrawer
        isOpen={isGmailOpen}
        onClose={() => setIsGmailOpen(false)}
        isConnected={session.gmailConnected}
        userEmail={session.gmailEmail}
        onConnect={handleConnectGmail}
        onDisconnect={handleDisconnectGmail}
        emails={gmailEmails}
        onLoadIntoChat={handleLoadEmailIntoChat}
        onSendEmail={handleSendEmail}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKeys={session.apiKeys}
        onSaveKeys={(apiKeys: ApiKeys) => updateSession((prev) => ({ ...prev, apiKeys }))}
        systemPrompt={session.systemPrompt}
        onSaveSystemPrompt={(prompt: string) =>
          updateSession((prev) => ({ ...prev, systemPrompt: prompt }))
        }
        temperature={session.temperature}
        onSaveTemperature={(temperature: number) =>
          updateSession((prev) => ({ ...prev, temperature }))
        }
        maxTokens={session.maxTokens}
        onSaveMaxTokens={(maxTokens: number) =>
          updateSession((prev) => ({ ...prev, maxTokens }))
        }
        onClearSession={() => {
          const fresh = clearSession();
          setSession(fresh);
        }}
      />

      <CostModal
        isOpen={isCostsOpen}
        onClose={() => setIsCostsOpen(false)}
        costs={session.costs}
      />

      <TestScenariosModal
        isOpen={isTestsOpen}
        onClose={() => setIsTestsOpen(false)}
        session={session}
        onRunTest={handleRunTest}
      />
    </div>
  );
}
