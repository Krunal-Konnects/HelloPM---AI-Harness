import { ModelId, ModelOption } from '../types';

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'claude-opus-5.5',
    name: 'Claude Opus 5.5',
    provider: 'anthropic',
    tag: 'Anthropic',
    description: 'Deep reasoning, nuanced writing & analytical tasks (User API Key)',
    isFree: false,
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o (Omni)',
    provider: 'openai',
    tag: 'OpenAI',
    description: 'High performance versatile multimodal model (User API Key)',
    isFree: false,
    inputCostPer1k: 0.005,
    outputCostPer1k: 0.015,
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash (Free Tier)',
    provider: 'gemini',
    tag: 'Google AI',
    description: 'Zero cost up to 15K requests/month. Recommended model for fast, intelligent reasoning and 1M context',
    isFree: true,
    inputCostPer1k: 0.0,
    outputCostPer1k: 0.0,
  },
  {
    id: 'grok-2',
    name: 'Grok-2',
    provider: 'xai',
    tag: 'xAI',
    description: 'Advanced xAI reasoning and conversational intelligence',
    isFree: false,
    inputCostPer1k: 0.005,
    outputCostPer1k: 0.015,
  },
];

export function getModelMeta(id: ModelId): ModelOption {
  return (
    AVAILABLE_MODELS.find((m) => m.id === id) ||
    AVAILABLE_MODELS.find((m) => m.id === 'gemini-3.8-flash')!
  );
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Standard token estimate: ~1 token per 4 chars or ~1.3 tokens per word
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words * 1.33));
}

export function calculateEstimatedCost(modelId: ModelId, inputTokens: number, estOutputTokens = 200): number {
  const meta = getModelMeta(modelId);
  if (meta.isFree) return 0;
  const inputCost = (inputTokens / 1000) * meta.inputCostPer1k;
  const outputCost = (estOutputTokens / 1000) * meta.outputCostPer1k;
  return Number((inputCost + outputCost).toFixed(5));
}

export function calculateActualCost(modelId: ModelId, inputTokens: number, outputTokens: number): number {
  const meta = getModelMeta(modelId);
  if (meta.isFree) return 0;
  const inputCost = (inputTokens / 1000) * meta.inputCostPer1k;
  const outputCost = (outputTokens / 1000) * meta.outputCostPer1k;
  return Number((inputCost + outputCost).toFixed(6));
}

export function formatCost(cost: number, isFreeTier = false): string {
  if (isFreeTier || cost === 0) return '$0.00 (Free)';
  if (cost < 0.0001) return '<$0.0001';
  return `$${cost.toFixed(4)}`;
}
