import * as XLSX from 'xlsx';
import { DocumentChunk, UploadedDocument } from '../types';

export function chunkText(rawText: string, docName: string, maxWordsPerChunk = 500): DocumentChunk[] {
  const paragraphs = rawText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chunks: DocumentChunk[] = [];
  let currentWords: string[] = [];
  let chunkIndex = 1;
  let currentTitle = `${docName} - Section 1`;

  for (const para of paragraphs) {
    // Check if paragraph looks like a heading
    const isHeading =
      para.length < 80 &&
      (para.startsWith('#') ||
        para.toUpperCase() === para ||
        /^[0-9]+\.\s+[A-Z]/.test(para) ||
        para.endsWith(':') ||
        para.startsWith('[Chunk'));

    if (isHeading && currentWords.length > 0) {
      // Create chunk from preceding words
      chunks.push({
        id: `chunk-${chunkIndex}`,
        chunkNumber: chunkIndex,
        title: currentTitle,
        content: currentWords.join(' '),
        wordCount: currentWords.length,
      });
      chunkIndex++;
      currentWords = [];
      currentTitle = `${docName} - ${para.replace(/^#+\s*/, '').replace(/[:]$/, '')}`;
    } else if (isHeading && currentWords.length === 0) {
      currentTitle = `${docName} - ${para.replace(/^#+\s*/, '').replace(/[:]$/, '')}`;
    }

    const paraWords = para.split(/\s+/).filter(Boolean);

    if (currentWords.length + paraWords.length <= maxWordsPerChunk) {
      currentWords.push(...paraWords);
    } else {
      // Split paragraph across chunks
      let remaining = paraWords;
      while (remaining.length > 0) {
        const space = maxWordsPerChunk - currentWords.length;
        if (remaining.length <= space) {
          currentWords.push(...remaining);
          remaining = [];
        } else {
          currentWords.push(...remaining.slice(0, space));
          remaining = remaining.slice(space);
          chunks.push({
            id: `chunk-${chunkIndex}`,
            chunkNumber: chunkIndex,
            title: currentTitle,
            content: currentWords.join(' '),
            wordCount: currentWords.length,
          });
          chunkIndex++;
          currentWords = [];
        }
      }
    }
  }

  if (currentWords.length > 0) {
    chunks.push({
      id: `chunk-${chunkIndex}`,
      chunkNumber: chunkIndex,
      title: currentTitle,
      content: currentWords.join(' '),
      wordCount: currentWords.length,
    });
  }

  // Fallback if empty
  if (chunks.length === 0) {
    chunks.push({
      id: 'chunk-1',
      chunkNumber: 1,
      title: `${docName} - Content`,
      content: rawText.slice(0, 1000) || 'Empty document',
      wordCount: rawText.split(/\s+/).length,
    });
  }

  return chunks;
}

export async function parseFileToDocument(file: File): Promise<UploadedDocument> {
  const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
  const size = file.size;

  if (size > 50 * 1024 * 1024) {
    throw new Error('File too large. Max 50MB. Try a smaller file.');
  }

  let docType: UploadedDocument['type'] = 'TXT';
  let fullText = '';

  if (fileExt === 'pdf') {
    docType = 'PDF';
    // In browser, read PDF as binary/text or structured stream
    const arrayBuffer = await file.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    const rawPdf = decoder.decode(arrayBuffer);
    
    // Extract stream / text blocks or clean text from raw PDF
    const textMatches = rawPdf.match(/\(([^()]+)\)[\s]*Tj/g);
    if (textMatches && textMatches.length > 5) {
      fullText = textMatches
        .map((m) => m.replace(/^\(/, '').replace(/\)[\s]*Tj$/, ''))
        .join(' ');
    } else {
      // Fallback text stripper
      const cleaned = rawPdf
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      fullText = cleaned.length > 200 ? cleaned.slice(0, 30000) : `[PDF Document: ${file.name}]\nExtracted readable segments from PDF container.`;
    }
  } else if (fileExt === 'xlsx' || fileExt === 'xls' || fileExt === 'csv') {
    docType = 'EXCEL';
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetTexts: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { header: 1 });
      sheetTexts.push(`--- Sheet: ${sheetName} ---`);
      for (const row of rows) {
        if (Array.isArray(row) && row.length > 0) {
          sheetTexts.push(row.map((cell) => (cell !== undefined && cell !== null ? String(cell) : '')).join(' | '));
        }
      }
    }
    fullText = sheetTexts.join('\n');
  } else if (fileExt === 'eml' || file.type.includes('email') || fileExt === 'msg') {
    docType = 'EMAIL';
    const rawContent = await file.text();
    // Parse RFC email headers
    const headerLines: string[] = [];
    const bodyLines: string[] = [];
    let inHeaders = true;

    for (const line of rawContent.split(/\r?\n/)) {
      if (inHeaders) {
        if (line.trim() === '') {
          inHeaders = false;
        } else {
          headerLines.push(line);
        }
      } else {
        bodyLines.push(line);
      }
    }

    const getHeader = (name: string) => {
      const found = headerLines.find((h) => h.toLowerCase().startsWith(name.toLowerCase() + ':'));
      return found ? found.substring(name.length + 1).trim() : 'N/A';
    };

    fullText = `Email Details:\nFrom: ${getHeader('From')}\nTo: ${getHeader('To')}\nSubject: ${getHeader('Subject')}\nDate: ${getHeader('Date')}\n\nBody:\n${bodyLines.join('\n')}`;
  } else if (fileExt === 'md') {
    docType = 'MARKDOWN';
    fullText = await file.text();
  } else {
    docType = 'TXT';
    fullText = await file.text();
  }

  const chunks = chunkText(fullText, file.name);

  return {
    id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: file.name,
    type: docType,
    size,
    uploadTime: new Date().toISOString().replace('T', ' ').substring(0, 16) + ' UTC',
    chunks,
    fullText,
  };
}

export function createSampleQ3Report(): UploadedDocument {
  const chunks: DocumentChunk[] = [
    {
      id: 'chunk-1',
      chunkNumber: 1,
      title: 'Q3 Report - [Chunk 1] Executive Summary',
      content:
        'Executive Summary: Q3 saw 25% revenue growth year-over-year, reaching $4.85M in total operating revenue. Key revenue drivers included expansion in enterprise software subscriptions (+34%), strategic partnerships in healthcare technology, and acceleration of self-serve API customer acquisitions. Net retention rate stood at 118% across high-tier accounts.',
      wordCount: 52,
    },
    {
      id: 'chunk-2',
      chunkNumber: 2,
      title: 'Q3 Report - [Chunk 2] Marketing Results',
      content:
        'Marketing Results Breakdown:\n- Campaign A (Paid Search & Developer Ads): $50K spend, generated 120K impressions, 3,400 signups, with an average CAC of $14.70.\n- Campaign B (Webinars & Content Syndication): $30K spend, generated 80K impressions, 1,950 enterprise demo bookings.\nTotal marketing spend was $80K against an allocated budget of $95K, delivering a blended ROAS of 3.8x.',
      wordCount: 61,
    },
    {
      id: 'chunk-3',
      chunkNumber: 3,
      title: 'Q3 Report - [Chunk 3] Challenges & Next Steps',
      content:
        'Challenges & Next Steps:\nSupply chain delays in third-party server racks temporarily impacted physical hardware integration testing during August. However, cloud migration mitigated customer impact.\nQ4 priorities include:\n1. Launching multi-provider AI model orchestration to reduce token expenditure by 40%.\n2. Expanding Gmail workflow automation for enterprise support desks.\n3. Completing SOC2 Type II compliance audit before November 15.',
      wordCount: 65,
    },
    {
      id: 'chunk-4',
      chunkNumber: 4,
      title: 'Q3 Report - [Chunk 4] Financial Projections & Margins',
      content:
        'Financial Projections & Cash Flow:\nGross profit margin expanded to 78.4% compared to 72.1% in Q2. Operating expenses were held steady at $1.2M per month. Cash runway remains healthy at 28 months with $14.2M in treasury reserves. Q4 forecast targets $5.6M in revenue, reflecting a conservative 15% sequential increase.',
      wordCount: 53,
    },
  ];

  const fullText = chunks.map((c) => `[Chunk ${c.chunkNumber}] ${c.title}\n${c.content}`).join('\n\n');

  return {
    id: 'q3_report_001',
    name: 'Q3 Report.pdf',
    type: 'PDF',
    size: 245 * 1024,
    uploadTime: '2026-09-27 10:00 UTC',
    chunks,
    fullText,
  };
}
