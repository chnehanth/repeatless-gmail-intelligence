import type { SourceCitation } from '@repeatless/shared';
import { embedOne } from '../ai/index.js';
import { matchEmbeddings, type MatchRow } from '../repos/embeddings.repo.js';
import { RAG_MIN_SIMILARITY, RAG_TOP_K } from '../config/constants.js';
import { ragRetrievedChunks } from '../observability/metrics.js';
import { truncate } from '../lib/text.js';

/** A retrieved source: one email chunk plus the metadata needed to cite it. */
export interface RetrievedSource {
  index: number; // 1-based, matches the [S<index>] marker in prompts
  messageId: string;
  threadId: string;
  gmailThreadId: string;
  subject: string | null;
  sender: string | null;
  date: string;
  content: string;
  similarity: number;
}

function senderLabel(from: MatchRow['from_address']): string | null {
  if (!from) return null;
  return from.name ? `${from.name} <${from.email}>` : from.email;
}

/**
 * Vector-retrieve the most relevant email chunks for a query and number them as
 * sources. Chunks are de-duplicated to one-per-message (keeping the best score)
 * so the model sees diverse emails rather than several chunks of the same one.
 */
export async function retrieveSources(
  userId: string,
  query: string,
  opts: { topK?: number; minScore?: number } = {},
): Promise<RetrievedSource[]> {
  const topK = opts.topK ?? RAG_TOP_K;
  const minScore = opts.minScore ?? RAG_MIN_SIMILARITY;

  const queryVector = await embedOne(query, 'query');
  // Over-fetch, then dedupe per message.
  const rows = await matchEmbeddings(userId, queryVector, topK * 3, minScore);

  const bestPerMessage = new Map<string, MatchRow>();
  for (const row of rows) {
    const existing = bestPerMessage.get(row.message_id);
    if (!existing || row.similarity > existing.similarity) bestPerMessage.set(row.message_id, row);
  }

  const deduped = [...bestPerMessage.values()].sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  ragRetrievedChunks.observe(deduped.length);

  return deduped.map((row, i) => ({
    index: i + 1,
    messageId: row.message_id,
    threadId: row.thread_id,
    gmailThreadId: row.gmail_thread_id,
    subject: row.subject,
    sender: senderLabel(row.from_address),
    date: row.internal_date,
    content: truncate(row.content, 1500),
    similarity: row.similarity,
  }));
}

/** Render sources as the numbered [S#] context block fed to the model. */
export function renderSourceBlock(sources: RetrievedSource[]): string {
  if (sources.length === 0) return '(no relevant emails found)';
  return sources
    .map(
      (s) =>
        `[S${s.index}] From: ${s.sender ?? 'unknown'} | Date: ${s.date} | Subject: ${s.subject ?? '(none)'}\n${s.content}`,
    )
    .join('\n\n');
}

export function toCitation(s: RetrievedSource): SourceCitation {
  return {
    threadId: s.threadId,
    messageId: s.messageId,
    subject: s.subject,
    sender: s.sender,
    date: s.date,
    snippet: truncate(s.content, 200),
  };
}

/** Extract the [S#] markers the model actually cited, in order of appearance. */
export function citedSources(answer: string, sources: RetrievedSource[]): SourceCitation[] {
  const cited = new Set<number>();
  for (const m of answer.matchAll(/\[S(\d+)\]/g)) {
    const n = Number(m[1]);
    if (n >= 1 && n <= sources.length) cited.add(n);
  }
  // If the model answered substantively but forgot to cite, fall back to the
  // top retrieved sources so the UI can still show provenance.
  const chosen = cited.size > 0 ? [...cited] : sources.slice(0, 3).map((s) => s.index);
  return chosen
    .sort((a, b) => a - b)
    .map((i) => sources[i - 1])
    .filter((s): s is RetrievedSource => Boolean(s))
    .map(toCitation);
}
