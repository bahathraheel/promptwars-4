/**
 * Tests: Knowledge Base retrieval engine
 * - Tests cosine similarity math
 * - Tests retrieval confidence guard
 * - Tests that low-confidence queries return isConfident=false
 */

import { _internals, retrieve, initializeKnowledgeBase } from '../services/knowledgeBase';
import * as path from 'path';

const { tokenize, cosineSimilarity } = _internals;

// Override KB path for tests
process.env['KNOWLEDGE_BASE_PATH'] = path.resolve(__dirname, '..', '..', '..', 'knowledge-base');

describe('Cosine similarity', () => {
  test('identical vectors return 1.0', () => {
    const v = [1, 2, 3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0);
  });

  test('orthogonal vectors return 0.0', () => {
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0.0);
  });

  test('zero vector returns 0.0', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
  });
});

describe('Tokenizer', () => {
  test('lowercases and splits on whitespace', () => {
    expect(tokenize('Gate 3 – South Entrance')).toContain('gate');
    expect(tokenize('Gate 3 – South Entrance')).toContain('south');
    expect(tokenize('Gate 3 – South Entrance')).toContain('entrance');
  });

  test('removes single-character tokens', () => {
    const tokens = tokenize('a b c hello');
    expect(tokens).not.toContain('a');
    expect(tokens).not.toContain('b');
    expect(tokens).toContain('hello');
  });
});

describe('Knowledge Base retrieval', () => {
  beforeAll(() => {
    _internals.reset();
    initializeKnowledgeBase();
  });

  test('retrieves relevant chunks for a gate query', () => {
    const result = retrieve('gate accessible wheelchair ramp');
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.topScore).toBeGreaterThan(0);
  });

  test('retrieval confidence guard: nonsense query yields isConfident=false', () => {
    const result = retrieve('xyzzy frobnicator quantum banana seventeen');
    expect(result.isConfident).toBe(false);
    expect(result.topScore).toBeLessThan(0.25);
  });

  test('retrieval confidence guard: relevant query yields isConfident=true', () => {
    const result = retrieve('where is the medical first aid station near gate');
    expect(result.isConfident).toBe(true);
  });

  test('returns chunks sorted by score descending', () => {
    const result = retrieve('parking lot north accessible spaces');
    const scores = result.chunks.map((r) => r.score);
    for (let i = 0; i < scores.length - 1; i++) {
      expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1] ?? 0);
    }
  });
});
