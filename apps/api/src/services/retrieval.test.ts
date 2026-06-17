import { describe, expect, it } from 'vitest';
import { citedSources, renderSourceBlock, type RetrievedSource } from './retrieval.service.js';

const sources: RetrievedSource[] = [
  { index: 1, messageId: 'm1', threadId: 't1', gmailThreadId: 'g1', subject: 'A', sender: 'a@x.com', date: '2026-01-01', content: 'alpha', similarity: 0.9 },
  { index: 2, messageId: 'm2', threadId: 't2', gmailThreadId: 'g2', subject: 'B', sender: 'b@x.com', date: '2026-01-02', content: 'beta', similarity: 0.8 },
  { index: 3, messageId: 'm3', threadId: 't3', gmailThreadId: 'g3', subject: 'C', sender: 'c@x.com', date: '2026-01-03', content: 'gamma', similarity: 0.7 },
];

describe('renderSourceBlock', () => {
  it('numbers sources and includes metadata', () => {
    const block = renderSourceBlock(sources);
    expect(block).toContain('[S1]');
    expect(block).toContain('Subject: A');
    expect(block).toContain('alpha');
  });
  it('handles no sources', () => {
    expect(renderSourceBlock([])).toContain('no relevant emails');
  });
});

describe('citedSources', () => {
  it('extracts only the cited markers', () => {
    const cited = citedSources('The answer is X [S2] and also Y [S2].', sources);
    expect(cited).toHaveLength(1);
    expect(cited[0]!.messageId).toBe('m2');
  });

  it('ignores out-of-range markers', () => {
    const cited = citedSources('Nonsense [S9]', sources);
    // falls back to top-3 when no valid citation present
    expect(cited.length).toBeGreaterThan(0);
    expect(cited.length).toBeLessThanOrEqual(3);
  });

  it('falls back to top sources when nothing is cited', () => {
    const cited = citedSources('A plain answer with no markers.', sources);
    expect(cited).toHaveLength(3);
  });
});
