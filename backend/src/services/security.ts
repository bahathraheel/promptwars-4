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

function tryDecodeBase64OrHex(text: string): string[] {
  const decodedTexts: string[] = [];

  // Base64 matching: words containing a-z, A-Z, 0-9, +, /, potentially ending in =. Min length 8.
  const base64Regex = /\b[a-zA-Z0-9+/]{8,}\b={0,2}/g;
  let match;
  while ((match = base64Regex.exec(text)) !== null) {
    const candidate = match[0];
    if (candidate.length % 4 === 0 || candidate.endsWith('=')) {
      try {
        const decoded = Buffer.from(candidate, 'base64').toString('utf8');
        // Acceptable decoded text criteria: printable ASCII + basic whitespaces
        if (/^[\x20-\x7E\r\n\t]+$/.test(decoded) && /[a-zA-Z]{3,}/.test(decoded)) {
          decodedTexts.push(decoded);
        }
      } catch {
        // ignore
      }
    }
  }

  // Hex matching: even-length words containing hex characters, length 8 to 120
  const hexRegex = /\b[a-fA-F0-9]{8,120}\b/g;
  while ((match = hexRegex.exec(text)) !== null) {
    const candidate = match[0];
    if (candidate.length % 2 === 0) {
      try {
        const decoded = Buffer.from(candidate, 'hex').toString('utf8');
        if (/^[\x20-\x7E\r\n\t]+$/.test(decoded) && /[a-zA-Z]{3,}/.test(decoded)) {
          decodedTexts.push(decoded);
        }
      } catch {
        // ignore
      }
    }
  }

  return decodedTexts;
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

  // Also check decoded prompt injections
  const decodedInputs = tryDecodeBase64OrHex(raw);
  for (const decoded of decodedInputs) {
    let decodedNorm = decoded.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[-.]/g, "")
      .replace(/\b([a-z])\s+(?=[a-z](?:\b|\s))/g, '$1')
      .replace(/[^a-z0-9]/g, " ")
      .replace(/\s+/g, " ").trim();

    for (const pattern of NORMALIZED_INJECTION_PATTERNS) {
      if (pattern.test(decodedNorm)) {
        flagged.push(`decoded_injection:${pattern.source}`);
      }
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

  // 1. HTML / XSS Injection Guard
  const XSS_PATTERNS = [
    /<script[^>]*>/i,
    /<\/script>/i,
    /javascript\s*:/i,
    /\bon[a-z]+\s*=\s*['"][^'"]*['"]/i, // event handlers
    /onload\s*=/i,
    /onerror\s*=/i,
    /iframe/i,
    /svg\s+onload/i
  ];
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(raw)) {
      flagged.push(`xss:${pattern.source}`);
    }
  }

  // 2. SQL / NoSQL Injection Guard
  const DATABASE_INJECTION_PATTERNS = [
    /\bunion\s+select\b/i,
    /\bselect\b.*\bfrom\b/i,
    /\binsert\s+into\b/i,
    /\bdrop\s+table\b/i,
    /\btruncate\s+table\b/i,
    /\b(or|and)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/i,
    /['"]\s*or\s*['"]\d+['"]?\s*=\s*['"]?\d+/i,
    /\$(eq|ne|gt|gte|lt|lte|in|nin|and|or|not|nor|where|regex)\b/i
  ];
  for (const pattern of DATABASE_INJECTION_PATTERNS) {
    if (pattern.test(raw)) {
      flagged.push(`database_injection:${pattern.source}`);
    }
  }

  // 3. Command Injection & Terminal bypass check
  const COMMAND_INJECTION_PATTERNS = [
    /\brm\s+-rf\b/i,
    /\bcat\s+\/etc\b/i,
    /\bchmod\s+\+?x\b/i,
    /\bcurl\s+http/i,
    /\bwget\s+http/i,
    /\beval\s*\(/i,
    /\bexec\s*\(/i,
    /\bsystem\s*\(/i,
    /[;&|]\s*(?:rm|cat|curl|wget|sh|bash|chmod|eval|exec)\b/i,
    /\|\s*(?:g?zip|tar|sh|bash|node|python)\b/i
  ];
  for (const pattern of COMMAND_INJECTION_PATTERNS) {
    if (pattern.test(raw)) {
      flagged.push(`command_injection:${pattern.source}`);
    }
  }

  // 4. Path Traversal & LFI Guard
  const PATH_TRAVERSAL_PATTERNS = [
    /\.\.(?:\/|\\)/,
    /\b(?:etc\/passwd|etc\/hosts|windows\/win\.ini|boot\.ini)\b/i
  ];
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(raw)) {
      flagged.push(`path_traversal:${pattern.source}`);
    }
  }

  // Strip obvious PII (phones, emails, credit cards, IPs, SSNs, and api keys)
  let clean = raw
    .replace(/\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/gi, '[email-redacted]')
    .replace(/\b(?:\d[ -]?){13,19}\b/g, '[credit-card-redacted]')
    .replace(/\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g, '[ip-redacted]')
    .replace(/\b(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}\b/gi, '[ip-redacted]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[ssn-redacted]')
    .replace(/\bey[jI][a-zA-Z0-9_=-]+\.[a-zA-Z0-9_=-]+\.[a-zA-Z0-9_=-]+\b/g, '[api-key-redacted]')
    .replace(/\b(?:bearer|token|apikey|api_key|secret|password)\s*[:=]\s*[a-zA-Z0-9_\-]{16,}\b/gi, '[api-key-redacted]')
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
