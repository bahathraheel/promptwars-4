/**
 * StadiumPulse AI – Input Sanitization & Security Guards
 *
 * Security measures:
 * 1. Prompt-injection guard: detects and strips attempts to override system
 *    instructions (e.g. "ignore above", "new instructions", role-swap phrases).
 * 2. PII scrubber: strips obvious phone numbers and email addresses from input.
 * 3. Max-length enforcement (done at Zod schema level, enforced again here).
 */

// ─── Prompt Injection Patterns ────────────────────────────────────────────

export interface SanitizeResult {
  clean: string;
  injectionDetected: boolean;
  flaggedPatterns: string[];
}

export function sanitizeInput(raw: string): SanitizeResult {
  const flagged: string[] = [];

  // Normalize text to bypass diacritic/accents and separator bypass attempts:
  // 1. Lowercase and remove accents / diacritics (e.g. ígñöré -> ignore)
  let normalized = raw.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // 2. Strip dashes and dots to collapse characters (e.g. i-g-n-o-r-e -> ignore)
  normalized = normalized.replace(/[-.]/g, "");

  // 3. Collapse single spaced-out letters (e.g. i g n o r e -> ignore)
  normalized = normalized.replace(/\b([a-z])\s+(?=[a-z](?:\b|\s))/g, '$1');

  // 4. Replace non-alphanumeric separators (emojis, symbols) with spaces
  normalized = normalized.replace(/[^a-z0-9]/g, " ");

  // 5. Compress duplicate spaces
  normalized = normalized.replace(/\s+/g, " ").trim();

  // Advanced Injection Patterns on normalized text
  const NORMALIZED_INJECTION_PATTERNS = [
    // ignore/forget previous/above directives
    /ignore\s+(?:all\s+)?(?:previous|above|prior|earlier|old|system)(?!\s+(?:complaints|incidents|warnings|failures|errors|records|games|matches|scores|players|teams|countries))/i,
    /forget\s+(?:everything|all|your\s+instructions|instructions|prompt|directives)/i,
    /you\s+are\s+(?:now|here|acting|henceforth)\s+(?:a|an)/i,
    /act\s+as\s+(?:if\s+you\s+are\s+)?(?:a|an)/i,
    /new\s+(?:system\s+)?instructions/i,
    /override\s+(?:all\s+)?(?:system|prompt|instructions|rules|directives)/i,
    /jailbreak/i,
    /dan\s+mode/i,
    /do\s+anything\s+now/i
  ];

  for (const pattern of NORMALIZED_INJECTION_PATTERNS) {
    if (pattern.test(normalized)) {
      flagged.push(pattern.source);
    }
  }

  // Also catch raw format wrapper injection attempts directly in raw input
  const RAW_PATTERNS = [
    /\[system\]/i,
    /\[assistant\]/i,
    /\[human\]/i,
    /<\/?system>/i,
  ];

  for (const pattern of RAW_PATTERNS) {
    if (pattern.test(raw)) {
      flagged.push(pattern.source);
    }
  }

  // Strip obvious PII (phones and emails) — we log for safety, not analytics
  let clean = raw
    .replace(/\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/gi, '[email-redacted]')
    .replace(/\b(\+?\d[\d\s\-().]{7,}\d)\b/g, '[phone-redacted]');

  // Truncate to safe length (belt-and-suspenders — Zod schema already limits)
  clean = clean.slice(0, 2000);

  return {
    clean,
    injectionDetected: flagged.length > 0,
    flaggedPatterns: flagged,
  };
}

// ─── Intent Classifier ────────────────────────────────────────────────────

/**
 * Classify query intent without LLM call (keyword-based).
 * Used for model-routing: cheap model for FAQs, balanced for navigation/safety.
 *
 * Returns an intent string and recommended model tier.
 */
export type IntentClass =
  | 'faq'
  | 'navigation'
  | 'medical'
  | 'transit'
  | 'food'
  | 'accessibility'
  | 'safety'
  | 'sustainability'
  | 'general';

const INTENT_RULES: Array<{ intent: IntentClass; keywords: RegExp }> = [
  { intent: 'medical',       keywords: /first aid|ambulan|medical|emergency|hurt|injured|sick|aed|defibrillat|heart attack/i },
  { intent: 'accessibility', keywords: /wheelchair|accessible|elevator|lift|ramp|disability|disabled|hearing|visual|blind|deaf/i },
  { intent: 'navigation',    keywords: /gate|entrance|section|seat|where is|how do i get|nearest|direction|route|concourse/i },
  { intent: 'transit',       keywords: /metro|bus|shuttle|train|subway|transport|parking|lot|station|how to get/i },
  { intent: 'food',          keywords: /food|eat|drink|vegetarian|vegan|halal|restaurant|snack|beverage|allergen/i },
  { intent: 'safety',        keywords: /safe|evacuat|security|prohibit|policy|rules|lost|found|emergency/i },
  { intent: 'sustainability', keywords: /recycle|bin|waste|trash|compost|carbon|emission|eco|sustainable|environment/i },
  { intent: 'faq',           keywords: /wifi|charge|re.?entry|ticket|language|staff|hours|open|close/i },
];

export function classifyIntent(text: string): IntentClass {
  for (const rule of INTENT_RULES) {
    if (rule.keywords.test(text)) return rule.intent;
  }
  return 'general';
}

/** Map intent to model tier */
export function intentToModelTier(intent: IntentClass): 'fast' | 'balanced' {
  if (intent === 'faq' || intent === 'general') return 'fast';
  return 'balanced'; // navigation/medical/safety need grounded, careful answers
}
