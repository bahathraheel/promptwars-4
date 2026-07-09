/**
 * StadiumPulse AI – Fan Copilot Chat Route
 *
 * POST /api/chat
 * - Validates and sanitizes input (injection guard)
 * - Classifies intent → selects model tier
 * - Retrieves grounded context from KB
 * - If confidence < threshold: returns refusal (never hallucinates)
 * - Detects language, retrieves in English, responds in user's language
 * - Supports chat, sms, pictogram, voice modes
 */

import { Router, type Request, type Response } from 'express';
import { ChatRequestSchema, ChatResponseSchema } from '../types/index.js';
import { retrieve } from '../services/knowledgeBase.js';
import { llmCall } from '../services/llmClient.js';
import { sanitizeInput, classifyIntent, intentToModelTier } from '../services/security.js';

const router = Router();

// ─── Language detection (lightweight heuristic + LLM fallback) ───────────

/** ISO-639-1 language names for prompt inclusion */
const LANG_NAMES: Record<string, string> = {
  en: 'English', es: 'Spanish', hi: 'Hindi', fr: 'French',
  ar: 'Arabic',  pt: 'Portuguese', zh: 'Mandarin Chinese', de: 'German',
};

/**
 * Detect likely language via a fast LLM call.
 * Returns ISO-639-1 code; defaults to 'en' on failure.
 */
async function detectLanguage(text: string): Promise<string> {
  try {
    const result = await llmCall({
      system: 'Detect the language of the following text. Reply ONLY with the ISO-639-1 two-letter code (e.g. "en", "es", "hi"). No other text.',
      user: text.slice(0, 200),
      tier: 'fast',
    });
    const code = result.text.trim().toLowerCase().slice(0, 5);
    // Basic validation: must be 2 alpha chars
    return /^[a-z]{2}$/.test(code) ? code : 'en';
  } catch {
    return 'en';
  }
}

// ─── System prompt builder ─────────────────────────────────────────────────

function buildSystemPrompt(
  mode: string,
  targetLanguage: string,
  context: string,
): string {
  const langName = LANG_NAMES[targetLanguage] ?? 'English';

  const modeNote =
    mode === 'sms'
      ? 'Respond in plain text only. No markdown. Max 2 short paragraphs.'
      : mode === 'pictogram'
      ? 'Use emoji pictograms liberally. Keep text very short. Lead with relevant emoji.'
      : mode === 'voice'
      ? 'Respond in natural spoken language. No bullet points or markdown. Short sentences.'
      : ''; // chat mode — standard markdown is fine

  return `You are the Fan Copilot for MetroArena 2026, the FIFA World Cup 2026 stadium assistant.
You help fans with navigation, accessibility, transport, food, safety, and general questions.
${modeNote}

GROUNDING RULE: Answer ONLY using the provided Knowledge Base context below.
If the context does not contain sufficient information, say you are not sure and ask the fan to visit a Guest Services desk or speak with a steward.
Never invent gate numbers, room locations, or safety procedures.

Respond in ${langName}.

KNOWLEDGE BASE CONTEXT:
${context}`;
}

// ─── Main route ───────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const startMs = Date.now();

  try {
    // 1. Parse & validate
    const parseResult = ChatRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Invalid request', details: parseResult.error.flatten() });
      return;
    }
    const { message, history, language, mode, sessionId: _sessionId } = parseResult.data;

    // 2. Sanitize & injection guard
    const { clean, injectionDetected, flaggedPatterns } = sanitizeInput(message);
    if (injectionDetected) {
      // Log and refuse — do not process injected prompt
      console.warn('[Security] Injection attempt detected', { flaggedPatterns });
      res.status(400).json({
        error: 'Message contains content that cannot be processed.',
        code: 'INJECTION_DETECTED',
      });
      return;
    }

    // 3. Classify intent → model tier
    const intent = classifyIntent(clean);
    const tier = intentToModelTier(intent);

    // 4. Retrieve grounded context
    const groundedCtx = retrieve(clean);
    if (!groundedCtx.isConfident) {
      // Explicit code-level guard — not just a prompt instruction
      const responseTimeMs = Date.now() - startMs;
      const notSureReply =
        mode === 'pictogram'
          ? '🙋 I\'m not sure about this. Please visit a 📍 Guest Services desk or ask a 👷 steward for help!'
          : 'I\'m not sure about that specific detail. For accurate information, please visit a Guest Services desk near Gate 1 or Gate 3, or ask any steward wearing a blue vest.';

      res.json(
        ChatResponseSchema.parse({
          reply: notSureReply,
          detectedLanguage: language ?? 'en',
          retrievedChunks: groundedCtx.chunks.length,
          topRetrievalScore: groundedCtx.topScore,
          isGrounded: false,
          intent,
          modelUsed: 'none (low-confidence guard)',
          responseTimeMs,
        }),
      );
      return;
    }

    // 5. Detect language (if not provided)
    const detectedLang = language ?? (await detectLanguage(clean));

    // 6. Build context string from top retrieved chunks
    const contextText = groundedCtx.chunks
      .slice(0, 3)
      .map((r, i) => `[${i + 1}] (${r.chunk.category}) ${r.chunk.text}`)
      .join('\n\n');

    const systemPrompt = buildSystemPrompt(mode, detectedLang, contextText);

    // 7. Call LLM
    const llmResult = await llmCall({
      system: systemPrompt,
      user: clean,
      tier,
      history: history.slice(-6), // last 6 turns for context
    });

    const responseTimeMs = Date.now() - startMs;

    res.json(
      ChatResponseSchema.parse({
        reply: llmResult.text,
        detectedLanguage: detectedLang,
        retrievedChunks: groundedCtx.chunks.length,
        topRetrievalScore: parseFloat(groundedCtx.topScore.toFixed(4)),
        isGrounded: true,
        intent,
        modelUsed: llmResult.modelUsed,
        responseTimeMs,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Chat operation failed';
    console.error('[ChatRoute] Error:', message);
    res.status(500).json({ error: message });
  }
});

export default router;
