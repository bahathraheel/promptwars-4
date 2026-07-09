/**
 * StadiumPulse AI – RAG Knowledge Base Engine
 *
 * Loads all knowledge-base JSON files at startup, converts each record to
 * plain-text chunks, computes a simple TF-IDF-inspired term-frequency
 * embedding (no external embedding API required), and exposes a retrieval
 * function with explicit confidence-guard logic.
 *
 * Design decisions:
 * - All embeddings are cached in memory at startup (not per-request).
 * - Cosine similarity over bag-of-words term vectors is used for retrieval;
 *   this is deterministic, free, and sufficient for a constrained domain KB.
 * - If top retrieval score < RETRIEVAL_CONFIDENCE_THRESHOLD the caller MUST
 *   issue a refusal — this is enforced by the isConfident flag, not just a
 *   prompt instruction.
 */

import * as fs from 'fs';
import * as path from 'path';
import type { KnowledgeChunk, RetrievalResult, GroundedContext } from '../types/index.js';

// ─── Configuration ─────────────────────────────────────────────────────────

const CONFIDENCE_THRESHOLD = parseFloat(
  process.env['RETRIEVAL_CONFIDENCE_THRESHOLD'] ?? '0.25',
);
const TOP_K = 5; // number of chunks to return

// ─── Vocabulary & Embedding Helpers ───────────────────────────────────────

/** Tokenize text to lowercase alpha tokens */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/** Build term-frequency map from tokens */
function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) {
    tf.set(t, (tf.get(t) ?? 0) + 1);
  }
  return tf;
}

/** Convert TF map to sparse vector using a shared vocabulary */
function toVector(tf: Map<string, number>, vocab: string[]): number[] {
  return vocab.map((term) => tf.get(term) ?? 0);
}

/** Cosine similarity between two vectors */
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    normA += (a[i] ?? 0) ** 2;
    normB += (b[i] ?? 0) ** 2;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ─── Chunking Logic ───────────────────────────────────────────────────────

/** Flatten a gate record to plain text */
function gateToText(gate: Record<string, unknown>): string {
  const features = Array.isArray(gate['accessible_features'])
    ? (gate['accessible_features'] as string[]).join(', ')
    : '';
  const parking = Array.isArray(gate['nearest_parking'])
    ? (gate['nearest_parking'] as string[]).join(', ')
    : '';
  return [
    `Gate: ${gate['name']}`,
    `Section: ${gate['location'] ? (gate['location'] as Record<string, unknown>)['section'] : ''}`,
    `Accessible: ${gate['accessible']}`,
    `Accessible features: ${features}`,
    `Nearest parking: ${parking}`,
    `Nearest transit: ${gate['nearest_transit_stop']}`,
    `Notes: ${gate['notes'] ?? ''}`,
    `Max capacity: ${gate['capacity_max']}`,
    `Opens: ${gate['typical_open_time']}`,
  ].join('. ');
}

/** Flatten any JSON object recursively to a string for simple chunking */
function objectToText(obj: unknown, depth = 0): string {
  if (depth > 5) return '';
  if (typeof obj === 'string') return obj;
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  if (Array.isArray(obj)) return obj.map((item) => objectToText(item, depth + 1)).join('. ');
  if (obj && typeof obj === 'object') {
    return Object.entries(obj as Record<string, unknown>)
      .filter(([k]) => !['id', 'coordinates', 'lat', 'lng', 'embedding'].includes(k))
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${objectToText(v, depth + 1)}`)
      .join('. ');
  }
  return '';
}

// ─── Loader ───────────────────────────────────────────────────────────────

/** Load all knowledge base JSON files and produce flat KnowledgeChunk[] */
function loadChunks(kbDir: string): Omit<KnowledgeChunk, 'embedding'>[] {
  const chunks: Omit<KnowledgeChunk, 'embedding'>[] = [];
  const files = fs.readdirSync(kbDir).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    const raw = fs.readFileSync(path.join(kbDir, file), 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;
    const source = file;

    // Process each top-level array in the JSON
    for (const [key, value] of Object.entries(data)) {
      if (!Array.isArray(value)) continue;

      for (const item of value as Record<string, unknown>[]) {
        const itemId = (item['id'] as string | undefined) ?? `${key}-${chunks.length}`;

        // Gates get special detailed text; others use generic flattener
        const text =
          key === 'gates' ? gateToText(item) : objectToText(item);

        // Derive category label from key
        const category = key
          .replace(/[_-]/g, ' ')
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .toLowerCase();

        chunks.push({
          id: `${source}::${itemId}`,
          source,
          category,
          text: text.trim(),
          metadata: item as Record<string, unknown>,
        });
      }
    }
  }

  return chunks;
}

// ─── Knowledge Base Singleton ────────────────────────────────────────────

let _chunks: KnowledgeChunk[] = [];
let _vocab: string[] = [];
let _initialized = false;

export function initializeKnowledgeBase(): void {
  if (_initialized) return;

  const kbDir = path.resolve(
    process.env['KNOWLEDGE_BASE_PATH'] ?? path.join(__dirname, '..', '..', '..', 'knowledge-base'),
  );

  const rawChunks = loadChunks(kbDir);

  // Build vocabulary from all chunks
  const vocabSet = new Set<string>();
  for (const chunk of rawChunks) {
    for (const token of tokenize(chunk.text)) {
      vocabSet.add(token);
    }
  }
  _vocab = Array.from(vocabSet).sort();

  // Compute embeddings
  _chunks = rawChunks.map((chunk) => {
    const tokens = tokenize(chunk.text);
    const tf = termFrequency(tokens);
    const embedding = toVector(tf, _vocab);
    return { ...chunk, embedding };
  });

  _initialized = true;
  console.log(`[KB] Initialized: ${_chunks.length} chunks, vocab size: ${_vocab.length}`);
}

// ─── Retrieval ────────────────────────────────────────────────────────────

/**
 * Retrieve top-K relevant chunks for a query.
 * Returns a GroundedContext with isConfident=false if no chunk exceeds threshold.
 */
export function retrieve(query: string, topK: number = TOP_K): GroundedContext {
  if (!_initialized) {
    throw new Error('Knowledge base not initialized. Call initializeKnowledgeBase() first.');
  }

  const queryTokens = tokenize(query);
  const queryTF = termFrequency(queryTokens);
  const queryVec = toVector(queryTF, _vocab);

  const scored: RetrievalResult[] = _chunks
    .map((chunk) => ({
      chunk,
      score: cosineSimilarity(queryVec, chunk.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  const topScore = scored[0]?.score ?? 0;

  return {
    chunks: scored,
    topScore,
    isConfident: topScore >= CONFIDENCE_THRESHOLD,
  };
}

/** Exposed for testing */
export const _internals = {
  tokenize,
  cosineSimilarity,
  toVector,
  termFrequency,
  getChunks: () => _chunks,
  getVocab: () => _vocab,
  reset: () => {
    _chunks = [];
    _vocab = [];
    _initialized = false;
  },
};
