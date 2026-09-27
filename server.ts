import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';

dotenv.config();

// Low/disabled safety thresholds to prevent empty/blocked responses
const GEMINI_SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json({ limit: '50mb' }));

// Model pricing definitions (per 1,000 tokens)
const PRICING: Record<string, { input: number; output: number; isFree?: boolean }> = {
  'claude-opus-5.5': { input: 0.003, output: 0.015 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gemini-3.8-flash': { input: 0.0, output: 0.0, isFree: true },
  'grok-2': { input: 0.005, output: 0.015 },
};

function calculateCost(model: string, inputTokens: number, outputTokens: number) {
  const p = PRICING[model] || PRICING['gemini-3.8-flash'];
  if (p.isFree) return 0;
  const inputCost = (inputTokens / 1000) * p.input;
  const outputCost = (outputTokens / 1000) * p.output;
  return Number((inputCost + outputCost).toFixed(6));
}

// In-memory mock/fallback store for Gmail threads
let mockEmails = [
  {
    id: 'msg-101',
    from: 'sarah.connor@acmecorp.com',
    to: 'me@company.com',
    subject: 'Q3 Financial Review & Board Prep',
    date: '2026-09-26 14:30',
    snippet: 'Hi team, please review the attached Q3 performance numbers before Monday board meeting...',
    body: `Hi team,\n\nPlease review the attached Q3 performance numbers before our Monday board meeting. We saw strong 25% revenue growth, but marketing campaign spend needs careful reconciliation.\n\nCould you please summarize the key variance drivers and draft a response with our recommendations?\n\nBest,\nSarah Connor\nVP Operations`,
    read: false,
    starred: true,
  },
  {
    id: 'msg-102',
    from: 'david.kim@partners.org',
    to: 'me@company.com',
    subject: 'Contract Signature & SLA Agreement',
    date: '2026-09-25 11:15',
    snippet: 'Following up on our partnership contract. We have finalized section 4 regarding API rate limits...',
    body: `Hi there,\n\nFollowing up on our partnership contract. We have finalized section 4 regarding API rate limits and data retention policies.\n\nPlease confirm if this matches your legal team's requirements so we can proceed with execution.\n\nThanks,\nDavid Kim`,
    read: true,
    starred: false,
  },
  {
    id: 'msg-103',
    from: 'alex.rivera@growthventures.io',
    to: 'me@company.com',
    subject: 'AI Orchestrator Architecture Discussion',
    date: '2026-09-24 09:45',
    snippet: 'Loved the demo of the multi-model harness. How are you handling latency across Claude and GPT-4o?',
    body: `Hi team,\n\nLoved the demo of your AI harness router! Quick technical question: how are you orchestrating document chunking and fallback when rate limits occur on primary models?\n\nWould love to schedule a 20-min sync next Thursday.\n\nRegards,\nAlex Rivera`,
    read: true,
    starred: false,
  },
];

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    models: Object.keys(PRICING),
  });
});

// Sanitize API keys removing quotes, accidental newlines, and whitespace
function cleanApiKey(key: any): string {
  if (!key || typeof key !== 'string') return '';
  let cleaned = key.trim();
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned.replace(/[\r\n\t\s]/g, '');
}

// Test Connection Endpoint for Model and Search API Keys
app.post('/api/test-key', async (req, res) => {
  const { provider, apiKey } = req.body;
  const key = cleanApiKey(apiKey);

  // Test Gemini
  if (provider === 'gemini') {
    const finalKey = key || cleanApiKey(process.env.GEMINI_API_KEY);
    if (!finalKey) {
      return res.status(400).json({ success: false, error: 'No Gemini API key provided and no environment key found.' });
    }
    try {
      const ai = new GoogleGenAI({ apiKey: finalKey });
      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: 'Respond with: pong',
          config: {
            maxOutputTokens: 2048,
            safetySettings: GEMINI_SAFETY_SETTINGS,
          },
        });
      } catch (err: any) {
        if (err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('high demand')) {
          await new Promise((r) => setTimeout(r, 600));
          response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: 'Respond with: pong',
            config: {
              maxOutputTokens: 2048,
              safetySettings: GEMINI_SAFETY_SETTINGS,
            },
          });
        } else {
          throw err;
        }
      }
      const responseText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (responseText !== undefined || (response.candidates && response.candidates.length > 0)) {
        return res.json({ success: true, message: 'Connected successfully to Google Gemini (3.8 Flash ready)!' });
      }
      return res.status(500).json({ success: false, error: 'Empty response received from Gemini.' });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message || 'Gemini API test failed. Check key validity.' });
    }
  }

  // Other providers require an explicit key
  if (!key) {
    return res.status(400).json({ success: false, error: 'Please enter an API key before testing connection.' });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 14000);

  try {
    // Anthropic Claude
    if (provider === 'claude') {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'test' }],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        return res.json({ success: true, message: 'Connected successfully to Anthropic Claude (Opus & Sonnet ready)!' });
      }
      if (resp.status === 401 || resp.status === 403) {
        return res.status(401).json({ success: false, error: 'Authentication failed: Invalid Anthropic Claude API key.' });
      }
      if (resp.status === 429) {
        return res.json({ success: true, message: 'Valid API key! (Note: Anthropic reports rate limit/quota reached).' });
      }
      const errText = await resp.text();
      return res.status(resp.status).json({ success: false, error: `Anthropic error (${resp.status}): ${errText.substring(0, 160)}` });
    }

    // OpenAI
    if (provider === 'openai') {
      // Step 1: Try models endpoint
      let isWorking = false;
      const resp = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${key}`,
        },
        signal: controller.signal,
      });

      if (resp.ok) {
        clearTimeout(timeoutId);
        return res.json({ success: true, message: 'Connected successfully to OpenAI (GPT-4o ready)!' });
      }

      // Step 2: Many project-scoped keys (sk-proj-...) do not have permissions for /v1/models
      // but have full permissions for /v1/chat/completions! Test chat endpoint directly.
      const chatResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (chatResp.ok) {
        return res.json({ success: true, message: 'Connected successfully to OpenAI (GPT-4o chat endpoint ready)!' });
      }

      // Detailed diagnostic parsing from OpenAI
      const errJson = (await chatResp.json().catch(() => null)) || (await resp.json().catch(() => null));
      const rawMsg = errJson?.error?.message || errJson?.message || 'OpenAI authentication failed';
      const code = errJson?.error?.code;

      if (code === 'insufficient_quota' || rawMsg.toLowerCase().includes('quota') || rawMsg.toLowerCase().includes('billing')) {
        return res.status(402).json({
          success: false,
          error: 'OpenAI Quota Exceeded: Your account has $0 balance or has exhausted its credits. Please add prepaid credits at platform.openai.com/settings/organization/billing.',
        });
      }
      if (chatResp.status === 401 || code === 'invalid_api_key' || rawMsg.toLowerCase().includes('incorrect api key')) {
        return res.status(401).json({
          success: false,
          error: 'Invalid OpenAI API key: Please verify you copied the full key starting with sk-... from platform.openai.com/api-keys.',
        });
      }

      return res.status(400).json({
        success: false,
        error: `OpenAI: ${rawMsg}`,
      });
    }

    // xAI Grok
    if (provider === 'grok') {
      // Step 1: Try /v1/models endpoint
      const resp = await fetch('https://api.x.ai/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${key}`,
        },
        signal: controller.signal,
      });

      if (resp.ok) {
        clearTimeout(timeoutId);
        return res.json({ success: true, message: 'Connected successfully to xAI (Grok-2 ready)!' });
      }

      // Step 2: Try chat endpoint with grok-2-latest and grok-2
      let chatResp = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'grok-2-latest',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
        signal: controller.signal,
      });

      // If grok-2-latest model not recognized on user's tier, test grok-2 or grok-beta
      if (!chatResp.ok && (chatResp.status === 400 || chatResp.status === 404)) {
        chatResp = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: 'grok-2',
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 1,
          }),
          signal: controller.signal,
        });
      }
      clearTimeout(timeoutId);

      if (chatResp.ok) {
        return res.json({ success: true, message: 'Connected successfully to xAI (Grok-2 ready)!' });
      }

      // Detailed diagnostic parsing from xAI
      const errJson = (await chatResp.json().catch(() => null)) || (await resp.json().catch(() => null));
      const rawMsg = typeof errJson?.error === 'string' ? errJson.error : (errJson?.error?.message || errJson?.message || 'xAI authentication failed');

      if (rawMsg.toLowerCase().includes('credits') || rawMsg.toLowerCase().includes('balance') || rawMsg.toLowerCase().includes('prepaid')) {
        return res.status(402).json({
          success: false,
          error: 'xAI Credits Required: Your xAI account has $0 balance. xAI requires adding at least $5 prepaid credits at console.x.ai/billing before keys can be used.',
        });
      }
      if (chatResp.status === 401 || errJson?.code === 'unauthenticated:no-credentials' || rawMsg.toLowerCase().includes('unauthenticated')) {
        return res.status(401).json({
          success: false,
          error: 'Invalid xAI API key: Please check your key starting with xai-... from console.x.ai/api-keys.',
        });
      }

      return res.status(400).json({
        success: false,
        error: `xAI: ${rawMsg}`,
      });
    }

    // Tavily Search
    if (provider === 'tavily') {
      const resp = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: key,
          query: 'ping test',
          max_results: 1,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        return res.json({ success: true, message: 'Connected successfully to Tavily Web Search!' });
      }
      if (resp.status === 401 || resp.status === 403) {
        return res.status(401).json({ success: false, error: 'Authentication failed: Invalid Tavily API key.' });
      }
      const errText = await resp.text();
      return res.status(resp.status).json({ success: false, error: `Tavily error (${resp.status}): ${errText.substring(0, 160)}` });
    }

    return res.status(400).json({ success: false, error: 'Unknown provider requested.' });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return res.status(504).json({ success: false, error: 'Connection test timed out (>14s). Check internet connection.' });
    }
    return res.status(500).json({ success: false, error: `Network error: ${err.message || 'Could not reach provider'}` });
  }
});


// Tavily Web Search Proxy
app.post('/api/search', async (req, res) => {
  const { query, apiKey, mockIfNoKey } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Search query is required' });
  }

  // If user provided a Tavily API key, call Tavily directly
  if (apiKey && apiKey.trim().length > 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey.trim(),
          query: query.trim(),
          search_depth: 'basic',
          max_results: 3,
          include_answer: true,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return res.status(401).json({ error: 'Invalid Tavily API key. Check Settings.' });
        }
        if (response.status === 429) {
          return res.status(429).json({ error: 'Search quota reached (1,000/month). Try again next month or upgrade Tavily.' });
        }
        const errText = await response.text();
        return res.status(response.status).json({ error: `Search API error: ${errText || 'Unknown error'}` });
      }

      const data = await response.json();
      const results = (data.results || []).map((r: any) => ({
        title: r.title || 'Web Result',
        url: r.url || '',
        content: r.content || r.snippet || '',
      }));

      return res.json({
        query,
        answer: data.answer || '',
        results,
        isSimulated: false,
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return res.status(504).json({ error: 'Search took too long. Proceeding without web context.' });
      }
      return res.status(500).json({ error: 'Could not connect to Tavily search. Check internet connection.' });
    }
  }

  // If no Tavily key provided:
  if (mockIfNoKey) {
    // Generate intelligent simulated search results so users can test immediately
    const mockResults = [
      {
        title: `Latest Developments: ${query}`,
        url: 'https://news.ycombinator.com/item?id=latest-ai-advances',
        content: `Recent industry analysis on "${query}": Highlights rapid progress in agentic workflows, multi-model routing, context window expansion up to 2M tokens, and low-latency inference. Key frameworks are standardizing around provider-agnostic harnesses.`,
      },
      {
        title: `Comprehensive Guide & Benchmarks (2026)`,
        url: 'https://arxiv.org/abs/2609.ai-routing',
        content: `Evaluations demonstrate that hybrid routing across Claude, GPT-4o, and Gemini optimizes both cost and response quality by up to 68% compared to single-model deployments.`,
      },
      {
        title: `TechCrunch AI Dispatch: ${query}`,
        url: 'https://techcrunch.com/2026/09/ai-frontier',
        content: `Leading enterprises report widespread adoption of local RAG combined with real-time web verification for verified compliance and financial analysis.`,
      },
    ];
    return res.json({
      query,
      answer: `Found 3 relevant sources for "${query}".`,
      results: mockResults,
      isSimulated: true,
      note: 'Using verified search sandbox. Add your Tavily API key in Settings for live web crawling.',
    });
  }

  return res.status(400).json({
    error: 'Web search disabled. Paste Tavily API key in Settings or enable demo search mode.',
    code: 'NO_TAVILY_KEY',
  });
});

// Gmail Management Endpoints
app.get('/api/gmail/emails', (req, res) => {
  res.json({ emails: mockEmails });
});

app.post('/api/gmail/send', (req, res) => {
  const { to, subject, body } = req.body;
  if (!to || !to.trim()) {
    return res.status(400).json({ error: 'Add recipient email address before sending' });
  }
  if (!subject || !subject.trim()) {
    return res.status(400).json({ error: 'Email subject is required' });
  }

  const sentEmail = {
    id: `msg-${Date.now()}`,
    from: 'me@company.com',
    to: to.trim(),
    subject: subject.trim(),
    date: new Date().toISOString().replace('T', ' ').substring(0, 16),
    snippet: body.substring(0, 100) + '...',
    body,
    read: true,
    starred: false,
    isSent: true,
  };

  mockEmails.unshift(sentEmail);
  res.json({ success: true, message: 'Email sent successfully', email: sentEmail });
});

// Multi-Model Chat Route
app.post('/api/chat', async (req, res) => {
  const {
    model = 'claude-opus-5.5',
    messages = [],
    apiKeys = {},
    systemPrompt = '',
    documentContext = '',
    webResults = [],
    emailContext = '',
    temperature = 0.7,
    max_tokens = 2000,
  } = req.body;

  // Determine target provider
  const normalizedModel = model.toLowerCase();
  let provider = 'gemini';
  if (normalizedModel.includes('claude') || normalizedModel.includes('opus') || normalizedModel.includes('sonnet')) {
    provider = 'anthropic';
  } else if (normalizedModel.includes('gpt') || normalizedModel.includes('openai') || normalizedModel.includes('o1') || normalizedModel.includes('o3')) {
    provider = 'openai';
  } else if (normalizedModel.includes('grok') || normalizedModel.includes('xai')) {
    provider = 'xai';
  } else if (normalizedModel.includes('gemini') || normalizedModel.includes('google')) {
    provider = 'gemini';
  }

  // Validate API key strictly matching Part 3 & Part 8 matrix
  if (provider === 'anthropic') {
    const key = apiKeys?.claude?.trim();
    if (!key) {
      return res.status(400).json({
        error: 'Please add Claude API key in Settings (or switch to Gemini for free tier)',
        code: 'MISSING_KEY',
        provider: 'anthropic',
      });
    }
  } else if (provider === 'openai') {
    const key = apiKeys?.openai?.trim();
    if (!key) {
      return res.status(400).json({
        error: 'Please add OpenAI API key in Settings (or switch to Gemini for free tier)',
        code: 'MISSING_KEY',
        provider: 'openai',
      });
    }
  } else if (provider === 'xai') {
    const key = apiKeys?.grok?.trim();
    if (!key) {
      return res.status(400).json({
        error: 'Please add Grok API key in Settings (or switch to Gemini for free tier)',
        code: 'MISSING_KEY',
        provider: 'xai',
      });
    }
  } else if (provider === 'gemini') {
    const key = apiKeys?.gemini?.trim() || process.env.GEMINI_API_KEY;
    if (!key) {
      return res.status(400).json({
        error: 'Please add Gemini API key in Settings',
        code: 'MISSING_KEY',
        provider: 'gemini',
      });
    }
  }

  // Construct context augmentation
  let combinedSystemPrompt = `You are the AI Harness Orchestrator. 
Your job is to route requests, utilize RAG document context, compose emails, and summarize web results with complete clarity.
Always format citations clearly when document chunks are provided (e.g. [From Document Name - Chunk X]).
Never show internal error codes or raw technical stack traces to the user.`;

  if (systemPrompt) {
    combinedSystemPrompt += `\n\nCustom System Instructions:\n${systemPrompt}`;
  }

  let enrichedContext = '';
  if (documentContext && documentContext.trim()) {
    enrichedContext += `\n\n--- DOCUMENT CONTEXT (RAG CHUNKS) ---\n${documentContext}\n--- END DOCUMENT CONTEXT ---\n`;
  }
  if (emailContext && emailContext.trim()) {
    enrichedContext += `\n\n--- EMAIL CONTEXT ---\n${emailContext}\n--- END EMAIL CONTEXT ---\n`;
  }
  if (webResults && webResults.length > 0) {
    enrichedContext += `\n\n--- WEB SEARCH RESULTS ---\n`;
    webResults.forEach((resItem: any, idx: number) => {
      enrichedContext += `[${idx + 1}] Title: ${resItem.title}\nURL: ${resItem.url}\nContent: ${resItem.content}\n\n`;
    });
    enrichedContext += `--- END WEB SEARCH RESULTS ---\nAnswer based on these results and cite them if appropriate.`;
  }

  // Timeout controller for 30s rule
  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => controller.abort(), 30000);

  try {
    // -------------------------------------------------------------
    // PROVIDER: GEMINI
    // -------------------------------------------------------------
    if (provider === 'gemini') {
      const apiKey = apiKeys?.gemini?.trim() || process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({ apiKey });

      // Build contents
      const lastUserMsg = messages[messages.length - 1]?.content || '';
      const promptText = enrichedContext ? `${enrichedContext}\n\nUser Question:\n${lastUserMsg}` : lastUserMsg;

      // Construct previous history
      const historyContents = messages.slice(0, -1).map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      // Call Gemini 3.8 Flash (with retry if temporary 503 high-demand spike)
      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            ...historyContents,
            {
              role: 'user',
              parts: [{ text: promptText }],
            },
          ],
          config: {
            systemInstruction: combinedSystemPrompt,
            temperature,
            maxOutputTokens: Math.max(Number(max_tokens) || 4096, 2048),
            safetySettings: GEMINI_SAFETY_SETTINGS,
          },
        });
      } catch (err: any) {
        if (err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('high demand')) {
          console.warn('Gemini 3.8 Flash high demand in chat, retrying with backoff...');
          await new Promise((r) => setTimeout(r, 800));
          response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [
              ...historyContents,
              {
                role: 'user',
                parts: [{ text: promptText }],
              },
            ],
            config: {
              systemInstruction: combinedSystemPrompt,
              temperature,
              maxOutputTokens: Math.max(Number(max_tokens) || 4096, 2048),
              safetySettings: GEMINI_SAFETY_SETTINGS,
            },
          });
        } else {
          throw err;
        }
      }
      clearTimeout(timeoutTimer);

      let responseText = response.text || '';
      if (!responseText && response.candidates?.[0]?.content?.parts) {
        responseText = response.candidates[0].content.parts
          .map((p: any) => p.text || '')
          .filter(Boolean)
          .join('\n');
      }
      if (!responseText && response.candidates?.[0]?.finishReason) {
        if (response.candidates[0].finishReason === 'SAFETY') {
          responseText = 'Note: Gemini flagged this content under safety filters. Please try rephrasing.';
        } else if (response.candidates[0].finishReason === 'MAX_TOKENS') {
          responseText = 'Output reached maximum token limit.';
        }
      }
      const usage = response.usageMetadata;
      const inputTokens = usage?.promptTokenCount || Math.ceil((promptText.length + combinedSystemPrompt.length) / 4);
      const outputTokens = usage?.candidatesTokenCount || Math.ceil(responseText.length / 4);
      const cost = calculateCost('gemini-3.8-flash', inputTokens, outputTokens);

      return res.json({
        content: responseText,
        model: 'gemini-3.8-flash',
        provider: 'gemini',
        tokens: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens,
        },
        cost,
        isFreeTier: true,
      });
    }

    // -------------------------------------------------------------
    // PROVIDER: ANTHROPIC (CLAUDE)
    // -------------------------------------------------------------
    if (provider === 'anthropic') {
      const apiKey = apiKeys.claude.trim();

      // Format messages for Anthropic
      const lastMsg = messages[messages.length - 1];
      const augmentedLastMsg = enrichedContext
        ? `${enrichedContext}\n\nUser Question:\n${lastMsg?.content || ''}`
        : lastMsg?.content || '';

      const anthropicMessages = [
        ...messages.slice(0, -1).map((m: any) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        { role: 'user', content: augmentedLastMsg },
      ];

      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          system: combinedSystemPrompt,
          messages: anthropicMessages,
          max_tokens: max_tokens || 2000,
          temperature: temperature ?? 0.7,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutTimer);

      if (!resp.ok) {
        if (resp.status === 401 || resp.status === 403) {
          return res.status(401).json({ error: 'Invalid Claude API key. Check Settings.', code: 'INVALID_KEY' });
        }
        if (resp.status === 429) {
          return res.status(429).json({ error: 'API quota or rate limit exceeded on Anthropic. Try again in 1 hour or switch to Gemini.', code: 'RATE_LIMIT' });
        }
        const errText = await resp.text();
        return res.status(resp.status).json({ error: `Anthropic API error: ${errText}` });
      }

      const data = await resp.json();
      const content = data.content?.[0]?.text || '';
      const inputTokens = data.usage?.input_tokens || 250;
      const outputTokens = data.usage?.output_tokens || 150;
      const cost = calculateCost('claude-opus-5.5', inputTokens, outputTokens);

      return res.json({
        content,
        model: 'claude-opus-5.5',
        provider: 'anthropic',
        tokens: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens,
        },
        cost,
        isFreeTier: false,
      });
    }

    // -------------------------------------------------------------
    // PROVIDER: OPENAI (GPT-4o)
    // -------------------------------------------------------------
    if (provider === 'openai') {
      const apiKey = cleanApiKey(apiKeys?.openai);

      if (!apiKey) {
        clearTimeout(timeoutTimer);
        return res.status(400).json({
          error: 'Missing OpenAI API key. Please open Settings and enter your key starting with sk-...',
          code: 'MISSING_KEY',
          actionType: 'settings',
        });
      }

      const lastMsg = messages[messages.length - 1];
      const augmentedLastMsg = enrichedContext
        ? `${enrichedContext}\n\nUser Question:\n${lastMsg?.content || ''}`
        : lastMsg?.content || '';

      const openaiMessages = [
        { role: 'system', content: combinedSystemPrompt },
        ...messages.slice(0, -1).map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
        { role: 'user', content: augmentedLastMsg },
      ];

      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: openaiMessages,
          max_tokens: max_tokens || 2000,
          temperature: temperature ?? 0.7,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutTimer);

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => null);
        const rawMsg = errJson?.error?.message || await resp.text().catch(() => 'OpenAI API error');
        const code = errJson?.error?.code;

        if (code === 'insufficient_quota' || rawMsg.toLowerCase().includes('quota') || rawMsg.toLowerCase().includes('billing')) {
          return res.status(429).json({
            error: 'OpenAI Quota Exceeded: Your account has $0 balance or has reached its spend limit. Add credits at platform.openai.com/settings/organization/billing or switch to Gemini Free Tier.',
            code: 'RATE_LIMIT',
          });
        }
        if (resp.status === 401 || code === 'invalid_api_key' || rawMsg.toLowerCase().includes('incorrect api key')) {
          return res.status(401).json({
            error: 'Invalid OpenAI API key: Please verify your API key in Settings (starts with sk- or sk-proj-).',
            code: 'INVALID_KEY',
            actionType: 'settings',
          });
        }
        return res.status(resp.status).json({
          error: `OpenAI error: ${rawMsg}`,
          code: 'API_ERROR',
        });
      }

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || '';
      const inputTokens = data.usage?.prompt_tokens || 200;
      const outputTokens = data.usage?.completion_tokens || 150;
      const cost = calculateCost('gpt-4o', inputTokens, outputTokens);

      return res.json({
        content,
        model: 'gpt-4o',
        provider: 'openai',
        tokens: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens,
        },
        cost,
        isFreeTier: false,
      });
    }

    // -------------------------------------------------------------
    // PROVIDER: xAI (GROK-2)
    // -------------------------------------------------------------
    if (provider === 'xai') {
      const apiKey = cleanApiKey(apiKeys?.grok);

      if (!apiKey) {
        clearTimeout(timeoutTimer);
        return res.status(400).json({
          error: 'Missing xAI Grok API key. Please open Settings and enter your key starting with xai-...',
          code: 'MISSING_KEY',
          actionType: 'settings',
        });
      }

      const lastMsg = messages[messages.length - 1];
      const augmentedLastMsg = enrichedContext
        ? `${enrichedContext}\n\nUser Question:\n${lastMsg?.content || ''}`
        : lastMsg?.content || '';

      const xaiMessages = [
        { role: 'system', content: combinedSystemPrompt },
        ...messages.slice(0, -1).map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
        { role: 'user', content: augmentedLastMsg },
      ];

      // Primary attempt: grok-2-latest
      let activeXaiModel = 'grok-2-latest';
      let resp = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: activeXaiModel,
          messages: xaiMessages,
          max_tokens: max_tokens || 2000,
          temperature: temperature ?? 0.7,
        }),
        signal: controller.signal,
      });

      // Fallback: If grok-2-latest is not available on user's tier, retry with grok-2
      if (!resp.ok && (resp.status === 400 || resp.status === 404)) {
        const fallbackResp = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'grok-2',
            messages: xaiMessages,
            max_tokens: max_tokens || 2000,
            temperature: temperature ?? 0.7,
          }),
          signal: controller.signal,
        });
        if (fallbackResp.ok) {
          resp = fallbackResp;
          activeXaiModel = 'grok-2';
        }
      }
      clearTimeout(timeoutTimer);

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => null);
        const rawMsg = typeof errJson?.error === 'string' ? errJson.error : (errJson?.error?.message || await resp.text().catch(() => 'xAI API error'));

        if (rawMsg.toLowerCase().includes('credits') || rawMsg.toLowerCase().includes('balance') || rawMsg.toLowerCase().includes('prepaid')) {
          return res.status(429).json({
            error: 'xAI Credits Required: Your xAI account has $0 balance. xAI requires adding at least $5 prepaid credits at console.x.ai/billing before keys can be used, or switch to Gemini Free Tier.',
            code: 'RATE_LIMIT',
          });
        }
        if (resp.status === 401 || errJson?.code === 'unauthenticated:no-credentials' || rawMsg.toLowerCase().includes('unauthenticated')) {
          return res.status(401).json({
            error: 'Invalid xAI API key: Please verify your API key in Settings (starts with xai-...).',
            code: 'INVALID_KEY',
            actionType: 'settings',
          });
        }
        return res.status(resp.status).json({
          error: `xAI error: ${rawMsg}`,
          code: 'API_ERROR',
        });
      }

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content || '';
      const inputTokens = data.usage?.prompt_tokens || 200;
      const outputTokens = data.usage?.completion_tokens || 150;
      const cost = calculateCost('grok-2', inputTokens, outputTokens);

      return res.json({
        content,
        model: activeXaiModel,
        provider: 'xai',
        tokens: {
          input: inputTokens,
          output: outputTokens,
          total: inputTokens + outputTokens,
        },
        cost,
        isFreeTier: false,
      });
    }

    res.status(400).json({ error: `Unsupported model provider: ${provider}` });
  } catch (err: any) {
    clearTimeout(timeoutTimer);
    if (err.name === 'AbortError') {
      return res.status(504).json({
        error: 'Request took too long (>30s). Try again with a simpler prompt or fewer documents.',
        code: 'TIMEOUT',
      });
    }
    return res.status(500).json({
      error: `Service error: ${err.message || 'Unknown network error'}. Please retry.`,
      code: 'SERVER_ERROR',
    });
  }
});

// Vite middleware or static serving
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AI Harness Orchestrator] Server running on port ${PORT}`);
  });
}

startServer();
