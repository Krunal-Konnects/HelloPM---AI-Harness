import { HarnessSession, ModelId } from '../types';

const STORAGE_KEY = 'ai_harness_orchestrator_session_v1';

export function createDefaultSession(): HarnessSession {
  return {
    id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    startTime: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    selectedModel: 'gemini-3.8-flash', // Default to free Gemini 3.8 Flash
    messages: [
      {
        id: 'welcome-msg',
        role: 'assistant',
        content: `👋 **Welcome to AI Harness Orchestrator**\n\nI am your unified multi-model routing engine. Here is what I can do:\n\n1. **Multi-Model Routing**: Seamlessly route to Claude Opus, GPT-4o, Grok-2, or Gemini 3.8 Flash.\n2. **Document RAG**: Upload PDFs, Excel sheets, CSVs, or text files. I will automatically extract, chunk, and cite sources (e.g. \`[From Q3 Report - Chunk 2]\`).\n3. **Gmail Integration**: Inspect incoming threads, draft professional responses, and send emails.\n4. **Web Search**: Real-time web retrieval via Tavily search with live monthly quota monitoring.\n5. **Cost & Token Transparency**: Exact token accounting and real-time cost tracking with a $0 MVP free tier.\n\n*Try uploading the sample Q3 report or click **Test Scenarios** above to run the 8 prompt benchmark tests!*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        model: 'gemini-3.8-flash',
        provider: 'gemini',
        isFreeTier: true,
        tokens: { input: 45, output: 160, total: 205 },
        cost: 0,
      },
    ],
    documents: [],
    costs: {
      total: 0,
      totalTokens: 205,
      byModel: {
        'gemini-3.8-flash': { cost: 0, tokens: 205, calls: 1 },
      },
    },
    apiKeys: {
      claude: '',
      openai: '',
      gemini: '',
      grok: '',
      tavily: '',
    },
    gmailConnected: false,
    gmailEmail: 'user@company.com',
    searchConfig: {
      enabled: false,
      countThisMonth: 12,
      maxLimit: 1000,
      useDemoFallback: true,
    },
    systemPrompt: 'You are the AI Harness Orchestrator. Provide step-by-step, verified answers with transparent citations and zero raw technical error codes.',
    temperature: 0.7,
    maxTokens: 2000,
  };
}

export function loadSession(): { session: HarnessSession; isRestored: boolean; lastActivityText: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { session: createDefaultSession(), isRestored: false, lastActivityText: '' };
    }
    const parsed: HarnessSession = JSON.parse(raw);
    if ((parsed.selectedModel as string) === 'gemini-2.5-flash' || (parsed.selectedModel as string) === 'gemini-2.0-flash') {
      parsed.selectedModel = 'gemini-3.8-flash';
    }
    const lastTime = new Date(parsed.lastActivity || parsed.startTime);
    const diffMins = Math.round((Date.now() - lastTime.getTime()) / (1000 * 60));
    let timeText = 'just now';
    if (diffMins > 60) {
      timeText = `${Math.floor(diffMins / 60)} hour(s) ago`;
    } else if (diffMins > 0) {
      timeText = `${diffMins} min(s) ago`;
    }

    return {
      session: parsed,
      isRestored: true,
      lastActivityText: timeText,
    };
  } catch (e) {
    console.error('Error loading session from localStorage', e);
    return { session: createDefaultSession(), isRestored: false, lastActivityText: '' };
  }
}

export function saveSession(session: HarnessSession): void {
  try {
    const toSave: HarnessSession = {
      ...session,
      lastActivity: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Error saving session to localStorage', e);
  }
}

export function clearSession(): HarnessSession {
  localStorage.removeItem(STORAGE_KEY);
  return createDefaultSession();
}

export function exportSessionToJSON(session: HarnessSession): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(session, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `ai-harness-session-${session.id}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function exportSessionToMarkdown(session: HarnessSession): void {
  let md = `# AI Harness Orchestrator Session Export\n`;
  md += `**Session ID:** ${session.id}\n`;
  md += `**Date:** ${new Date(session.startTime).toLocaleString()}\n`;
  md += `**Total Session Cost:** $${session.costs.total.toFixed(4)} | Total Tokens: ${session.costs.totalTokens}\n\n`;
  md += `## Conversation\n\n`;

  for (const msg of session.messages) {
    const roleTitle = msg.role === 'user' ? '👤 User' : `🤖 Assistant (${msg.model || 'AI'})`;
    md += `### ${roleTitle} - ${msg.timestamp}\n`;
    if (msg.tokens) {
      md += `*Tokens: ${msg.tokens.total} (in: ${msg.tokens.input}, out: ${msg.tokens.output}) | Cost: $${(msg.cost || 0).toFixed(4)}*\n\n`;
    }
    md += `${msg.content}\n\n`;
    if (msg.emailDraft) {
      md += `#### ✉️ Drafted Email:\n**To:** ${msg.emailDraft.to}\n**Subject:** ${msg.emailDraft.subject}\n\`\`\`\n${msg.emailDraft.body}\n\`\`\`\n\n`;
    }
    md += `---\n\n`;
  }

  const dataStr = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(md);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `ai-harness-chat-${session.id}.md`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
