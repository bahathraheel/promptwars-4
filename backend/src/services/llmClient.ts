/**
 * StadiumPulse AI – LLM Client (Anthropic Claude or Google Gemini)
 *
 * Model routing strategy:
 *   - Google Gemini:
 *     - FAQ / simple / general  → gemini-2.5-flash
 *     - Reasoning / simulation  → gemini-2.5-pro
 *   - Anthropic Claude:
 *     - FAQ / simple / general  → claude-haiku-4-5
 *     - Reasoning / simulation  → claude-sonnet-4-5
 *
 * It uses GEMINI_API_KEY if present, otherwise falls back to ANTHROPIC_API_KEY.
 */

import Anthropic from '@anthropic-ai/sdk';

// ─── Client singletons ─────────────────────────────────────────────────────

let _anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    const apiKey = process.env['ANTHROPIC_API_KEY'];
    if (!apiKey) {
      throw new Error(
        'Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY environment variable is set. ' +
        'Please add one of these keys to your .env file.',
      );
    }
    _anthropicClient = new Anthropic({ apiKey });
  }
  return _anthropicClient;
}

// ─── Model configurations ──────────────────────────────────────────────────

export type ModelTier = 'fast' | 'balanced' | 'reasoning';

const ANTHROPIC_MODEL_MAP: Record<ModelTier, string> = {
  fast: 'claude-haiku-4-5',
  balanced: 'claude-sonnet-4-5',
  reasoning: 'claude-sonnet-4-5',
};

const ANTHROPIC_MAX_TOKENS: Record<ModelTier, number> = {
  fast: 512,
  balanced: 1024,
  reasoning: 2048,
};

// ─── LLMCallOptions and LLMCallResult ─────────────────────────────────────

export interface LLMCallOptions {
  system: string;
  user: string;
  tier: ModelTier;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface LLMCallResult {
  text: string;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
}

// ─── AI Response Cache ────────────────────────────────────────────────────
const llmResponseCache = new Map<string, LLMCallResult>();
let llmHits = 0;
let llmMisses = 0;

/**
 * Retrieves AI Response Cache Hit/Miss metrics.
 */
export function getLlmCacheMetrics() {
  return {
    hits: llmHits,
    misses: llmMisses,
    cacheSize: llmResponseCache.size,
  };
}

/**
 * Clears the LLM cache (for test and benchmark purposes).
 */
export function clearLlmCache() {
  llmResponseCache.clear();
  llmHits = 0;
  llmMisses = 0;
}

// ─── Core call wrapper ────────────────────────────────────────────────────

export async function llmCall(options: LLMCallOptions): Promise<LLMCallResult> {
  const cacheKey = `${options.tier}:${options.system ?? ''}:${options.user}`;
  
  if (llmResponseCache.has(cacheKey)) {
    llmHits++;
    return llmResponseCache.get(cacheKey)!;
  }

  llmMisses++;

  const result = await (async () => {
    const geminiKey = process.env['GEMINI_API_KEY'];
    if (geminiKey && geminiKey !== 'your_gemini_key_here') {
      return callGemini(options, geminiKey);
    }
    return callAnthropic(options);
  })();

  llmResponseCache.set(cacheKey, result);
  return result;
}

// ─── Anthropic implementation ──────────────────────────────────────────────

async function callAnthropic(options: LLMCallOptions): Promise<LLMCallResult> {
  const client = getAnthropicClient();
  const model = ANTHROPIC_MODEL_MAP[options.tier];
  const maxTokens = ANTHROPIC_MAX_TOKENS[options.tier];

  const messages: Anthropic.MessageParam[] = [
    ...(options.history ?? []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: options.user },
  ];

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: options.system,
    messages,
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');

  return {
    text,
    modelUsed: model,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

// ─── Gemini implementation ─────────────────────────────────────────────────

async function callGemini(options: LLMCallOptions, apiKey: string): Promise<LLMCallResult> {
  // Use gemini-2.5-flash for all tiers — stays within free-tier rate limits
  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents = [
    ...(options.history ?? []).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: options.user }] }
  ];

  const payload = {
    contents,
    systemInstruction: options.system ? {
      parts: [{ text: options.system }]
    } : undefined,
    generationConfig: {
      temperature: options.tier === 'reasoning' ? 0.45 : 0.2,
      maxOutputTokens: options.tier === 'reasoning' ? 2048 : 1024,
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
  }

  const result = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
    };
  };

  const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  return {
    text,
    modelUsed: model,
    inputTokens: result.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: result.usageMetadata?.candidatesTokenCount ?? 0,
  };
}

// ─── Exported model names for transparency ────────────────────────────────

export const MODEL_NAMES = {
  gemini: {
    fast: 'gemini-2.5-flash',
    balanced: 'gemini-2.5-flash',
    reasoning: 'gemini-2.5-pro',
  },
  claude: ANTHROPIC_MODEL_MAP,
};

