import { z } from 'zod';
import type { EmailMessage, NewsItem, SourceCitation } from '@repeatless/shared';
import { embedTexts, generateText } from '../ai/index.js';
import { NEWS_EXTRACT_SYSTEM } from '../ai/prompts.js';
import { parseJson } from '../ai/json.js';
import { NEWS_DEDUP_THRESHOLD } from '../config/constants.js';
import { cosineSimilarity } from '../lib/vector.js';
import { truncate } from '../lib/text.js';
import { mapWithConcurrency } from '../lib/concurrency.js';
import { getRecentMessagesByCategory } from '../repos/messages.repo.js';
import { childLogger } from '../observability/logger.js';

const log = childLogger('service:newsletter');

const extractSchema = z.object({
  items: z.array(z.object({ title: z.string(), summary: z.string() })).default([]),
});

interface RawNews {
  title: string;
  summary: string;
  source: SourceCitation;
}

/**
 * Build a deduplicated news digest from the user's newsletter emails over the
 * last `days`:
 *   1. extract discrete stories from each newsletter (LLM),
 *   2. embed each story,
 *   3. greedily cluster by cosine similarity (semantic dedup, not title match),
 *   4. emit one entry per cluster with all contributing sources attributed.
 */
export async function buildNewsDigest(userId: string, days: number): Promise<NewsItem[]> {
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const messages = await getRecentMessagesByCategory(userId, 'Newsletters', sinceIso, 60);
  if (messages.length === 0) return [];

  // 1) Extract stories per newsletter (bounded concurrency).
  const extracted = await mapWithConcurrency(messages, 3, async (msg) => extractStories(msg));
  const allItems: RawNews[] = extracted.flat();
  if (allItems.length === 0) return [];

  // 2) Embed each story (title + summary capture the semantic content).
  const vectors = await embedTexts(
    allItems.map((it) => `${it.title}. ${it.summary}`),
    'document',
  );

  // 3) Greedy clustering by cosine similarity.
  const clusters: { centroidIdx: number; members: number[] }[] = [];
  for (let i = 0; i < allItems.length; i += 1) {
    const vec = vectors[i];
    if (!vec) continue;
    let placed = false;
    for (const cluster of clusters) {
      const centroid = vectors[cluster.centroidIdx];
      if (centroid && cosineSimilarity(vec, centroid) >= NEWS_DEDUP_THRESHOLD) {
        cluster.members.push(i);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push({ centroidIdx: i, members: [i] });
  }

  // 4) Emit one NewsItem per cluster, attributing every source.
  const digest: NewsItem[] = clusters.map((cluster) => {
    const rep = allItems[cluster.centroidIdx]!;
    const sources = dedupeSources(cluster.members.map((idx) => allItems[idx]!.source));
    return { title: rep.title, summary: rep.summary, sources };
  });

  log.info({ userId, raw: allItems.length, unique: digest.length, days }, 'news digest built');
  return digest.sort((a, b) => b.sources.length - a.sources.length);
}

async function extractStories(msg: EmailMessage): Promise<RawNews[]> {
  const body = truncate(msg.bodyText ?? msg.snippet ?? '', 8000);
  if (!body.trim()) return [];
  const source: SourceCitation = {
    threadId: msg.threadId,
    messageId: msg.id,
    subject: msg.subject,
    sender: msg.fromAddress?.name ?? msg.fromAddress?.email ?? null,
    date: msg.internalDate,
    snippet: truncate(body, 160),
  };
  try {
    const { text } = await generateText(
      [{ role: 'user', content: `Newsletter subject: ${msg.subject ?? ''}\n\n${body}` }],
      { operation: 'news.extract', system: NEWS_EXTRACT_SYSTEM, temperature: 0, json: true, maxOutputTokens: 800 },
    );
    const parsed = parseJson(text, extractSchema);
    return parsed.items
      .filter((it) => it.title.trim())
      .map((it) => ({ title: it.title.trim(), summary: it.summary.trim(), source }));
  } catch (err) {
    log.warn({ messageId: msg.id, err: err instanceof Error ? err.message : err }, 'news extraction failed');
    return [];
  }
}

function dedupeSources(sources: SourceCitation[]): SourceCitation[] {
  const seen = new Map<string, SourceCitation>();
  for (const s of sources) {
    const key = s.messageId ?? `${s.sender}:${s.subject}`;
    if (!seen.has(key)) seen.set(key, s);
  }
  return [...seen.values()];
}
