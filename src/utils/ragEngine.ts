import { DocumentChunk, ModelId, UploadedDocument } from '../types';

export interface ParsedRequest {
  cleanQuery: string;
  detectedModel?: ModelId;
  needsRAG: boolean;
  needsGmail: boolean;
  needsSearch: boolean;
  referencedDocName?: string;
}

export function parseUserInput(input: string, documents: UploadedDocument[], gmailConnected: boolean): ParsedRequest {
  const lower = input.toLowerCase();

  // Model detection
  let detectedModel: ModelId | undefined = undefined;
  if (lower.includes('use claude') || lower.includes('use opus') || lower.includes('with claude')) {
    detectedModel = 'claude-opus-5.5';
  } else if (lower.includes('use gpt') || lower.includes('use openai') || lower.includes('with gpt-4') || lower.includes('using gpt')) {
    detectedModel = 'gpt-4o';
  } else if (lower.includes('use gemini') || lower.includes('use google') || lower.includes('with gemini')) {
    detectedModel = 'gemini-3.8-flash';
  } else if (lower.includes('use grok') || lower.includes('use xai') || lower.includes('with grok')) {
    detectedModel = 'grok-2';
  }

  // Gmail intent detection
  const needsGmail =
    lower.includes('email') ||
    lower.includes('draft an email') ||
    lower.includes('draft response to my boss') ||
    lower.includes('send to') ||
    lower.includes('inbox') ||
    lower.includes('mail');

  // Search intent detection
  const needsSearch =
    lower.includes('search') ||
    lower.includes('what is new') ||
    lower.includes('what\'s new') ||
    lower.includes('latest') ||
    lower.includes('trending') ||
    lower.includes('current news') ||
    lower.includes('recent benchmarks');

  // Document RAG detection
  let needsRAG = documents.length > 0;
  let referencedDocName: string | undefined = undefined;

  for (const doc of documents) {
    const simpleDocName = doc.name.toLowerCase().replace(/\.[a-z0-9]+$/, '');
    if (lower.includes(simpleDocName) || lower.includes('document') || lower.includes('report') || lower.includes('file') || lower.includes('attached')) {
      needsRAG = true;
      referencedDocName = doc.name;
      break;
    }
  }

  return {
    cleanQuery: input,
    detectedModel,
    needsRAG,
    needsGmail,
    needsSearch,
    referencedDocName,
  };
}

export function findRelevantChunks(
  query: string,
  documents: UploadedDocument[],
  maxChunks = 3
): { chunk: DocumentChunk; docName: string; score: number }[] {
  if (documents.length === 0) return [];

  const queryWords = query
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const scored: { chunk: DocumentChunk; docName: string; score: number }[] = [];

  for (const doc of documents) {
    for (const chunk of doc.chunks) {
      let score = 0;
      const chunkLower = chunk.content.toLowerCase();
      const titleLower = chunk.title.toLowerCase();

      for (const word of queryWords) {
        // Exact word match
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const matchesInContent = (chunkLower.match(regex) || []).length;
        const matchesInTitle = (titleLower.match(regex) || []).length;

        score += matchesInContent * 2;
        score += matchesInTitle * 5;
      }

      // Proximity & keyword combinations
      if (queryWords.length >= 2) {
        const fullQuery = queryWords.join(' ');
        if (chunkLower.includes(fullQuery)) {
          score += 15;
        }
      }

      // Bonus if chunk number is explicitly asked (e.g. "Chunk 2")
      const chunkNumMatch = query.match(/chunk\s*([0-9]+)/i);
      if (chunkNumMatch && Number(chunkNumMatch[1]) === chunk.chunkNumber) {
        score += 50;
      }

      scored.push({
        chunk,
        docName: doc.name,
        score,
      });
    }
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  // If top scores are 0, return first chunks of the primary document so context is preserved
  if (scored.length > 0 && scored[0].score === 0) {
    return scored.slice(0, Math.min(maxChunks, scored.length));
  }

  return scored.slice(0, maxChunks);
}

export function buildRAGContext(relevant: { chunk: DocumentChunk; docName: string; score: number }[]): string {
  if (relevant.length === 0) return '';

  return relevant
    .map((item) => {
      return `[From ${item.docName} - Chunk ${item.chunk.chunkNumber}] ${item.chunk.title}:\n${item.chunk.content}`;
    })
    .join('\n\n');
}

export function extractCitations(text: string): Array<{ docName: string; chunkNum: number; snippet: string }> {
  const citations: Array<{ docName: string; chunkNum: number; snippet: string }> = [];
  // Match patterns like: [From Q3 Report - Chunk 2] or [From Document.pdf - Chunk 1] or [Chunk 2]
  const regex = /\[From\s+([^-\]]+)\s*-\s*Chunk\s*([0-9]+)\]|\[Chunk\s*([0-9]+)\]/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const docName = match[1]?.trim() || 'Document';
    const chunkNum = Number(match[2] || match[3] || 1);
    citations.push({
      docName,
      chunkNum,
      snippet: match[0],
    });
  }
  return citations;
}
