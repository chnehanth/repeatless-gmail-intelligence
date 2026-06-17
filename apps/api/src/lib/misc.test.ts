import { describe, expect, it } from 'vitest';
import { cosineSimilarity } from './vector.js';
import { chunkText } from './text.js';
import { mapWithConcurrency } from './concurrency.js';
import { extractJson } from '../ai/json.js';
import { withRetry } from './retry.js';

describe('cosineSimilarity', () => {
  it('is 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6);
  });
  it('is 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
  });
  it('handles zero vectors gracefully', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});

describe('chunkText', () => {
  it('returns a single chunk for short text', () => {
    expect(chunkText('hello world', 100, 10)).toEqual(['hello world']);
  });
  it('splits long text into overlapping chunks', () => {
    const text = 'a'.repeat(50) + '. ' + 'b'.repeat(50);
    const chunks = chunkText(text, 40, 10);
    expect(chunks.length).toBeGreaterThan(1);
  });
  it('returns empty array for blank text', () => {
    expect(chunkText('   ')).toEqual([]);
  });
});

describe('mapWithConcurrency', () => {
  it('preserves order and processes all items', async () => {
    const result = await mapWithConcurrency([1, 2, 3, 4], 2, async (n) => n * 10);
    expect(result).toEqual([10, 20, 30, 40]);
  });
});

describe('extractJson', () => {
  it('parses plain JSON', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
  });
  it('parses fenced JSON', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it('extracts JSON embedded in prose', () => {
    expect(extractJson('Here you go: {"a":[1,2]} done')).toEqual({ a: [1, 2] });
  });
});

describe('withRetry', () => {
  it('retries then succeeds', async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error('transient');
        return 'ok';
      },
      { retries: 5, baseDelayMs: 1, sleep: async () => undefined },
    );
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  it('stops on non-retryable errors', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new Error('fatal');
        },
        { retries: 5, isRetryable: () => false, sleep: async () => undefined },
      ),
    ).rejects.toThrow('fatal');
    expect(calls).toBe(1);
  });
});
