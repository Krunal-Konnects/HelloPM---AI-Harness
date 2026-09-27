export type ModelId = 
  | 'claude-opus-5.5'
  | 'gpt-4o'
  | 'gemini-3.8-flash'
  | 'grok-2';

export interface ModelOption {
  id: ModelId;
  name: string;
  provider: 'anthropic' | 'openai' | 'gemini' | 'xai';
  tag: string;
  description: string;
  isFree: boolean;
  inputCostPer1k: number;
  outputCostPer1k: number;
}

export interface DocumentChunk {
  id: string;
  chunkNumber: number;
  title: string;
  content: string;
  wordCount: number;
}

export interface UploadedDocument {
  id: string;
  name: string;
  type: 'PDF' | 'EXCEL' | 'EMAIL' | 'TXT' | 'MARKDOWN';
  size: number;
  uploadTime: string;
  chunks: DocumentChunk[];
  fullText: string;
}

export interface WebSearchResult {
  title: string;
  url: string;
  content: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  model?: ModelId;
  provider?: string;
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
  cost?: number;
  isFreeTier?: boolean;
  documentCitations?: Array<{ docName: string; chunkNum: number; snippet: string }>;
  webResults?: WebSearchResult[];
  emailDraft?: {
    to: string;
    subject: string;
    body: string;
    isSent?: boolean;
  };
  error?: {
    message: string;
    code?: string;
    actionLabel?: string;
    actionType?: 'settings' | 'switch-gemini' | 'retry';
  };
}

export interface EmailItem {
  id: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
  read: boolean;
  starred: boolean;
  isSent?: boolean;
}

export interface SessionCosts {
  total: number;
  totalTokens: number;
  byModel: Record<string, { cost: number; tokens: number; calls: number }>;
}

export interface ApiKeys {
  claude: string;
  openai: string;
  gemini: string;
  grok: string;
  tavily: string;
}

export interface SearchConfig {
  enabled: boolean;
  countThisMonth: number;
  maxLimit: number;
  useDemoFallback: boolean;
}

export interface HarnessSession {
  id: string;
  startTime: string;
  lastActivity: string;
  selectedModel: ModelId;
  messages: ChatMessage[];
  documents: UploadedDocument[];
  costs: SessionCosts;
  apiKeys: ApiKeys;
  gmailConnected: boolean;
  gmailEmail: string;
  searchConfig: SearchConfig;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}
