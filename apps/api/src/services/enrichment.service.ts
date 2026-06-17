import { childLogger } from '../observability/logger.js';
import { getThreadsNeedingEnrichment } from '../repos/threads.repo.js';
import { getMessageIdsWithoutEmbeddings } from '../repos/embeddings.repo.js';
import { summarizeThread } from './summarization.service.js';
import { categorizeThread } from './categorization.service.js';
import { embedMessage } from './embedding.service.js';
import { mapWithConcurrency } from '../lib/concurrency.js';

const log = childLogger('service:enrichment');

/** Per-instance lock to avoid concurrent enrichment fan-out for a user. */
const enriching = new Set<string>();

const THREAD_BATCH = 40;
const EMBED_BATCH = 80;
const AI_CONCURRENCY = 3; // keep modest to respect provider rate limits

/**
 * Bring a user's AI-derived data up to date: thread summaries + categories and
 * message embeddings. Idempotent and resumable — only processes rows that are
 * still missing their derived data, so it can be re-run safely and picks up
 * where a previous (possibly interrupted) run left off.
 */
export async function enrichUserBacklog(userId: string): Promise<{ threads: number; embeddings: number }> {
  if (enriching.has(userId)) {
    log.debug({ userId }, 'enrichment already running; skipping');
    return { threads: 0, embeddings: 0 };
  }
  enriching.add(userId);
  try {
    const threadIds = await getThreadsNeedingEnrichment(userId, THREAD_BATCH);
    await mapWithConcurrency(threadIds, AI_CONCURRENCY, async (threadId) => {
      try {
        await categorizeThread(userId, threadId);
        await summarizeThread(userId, threadId);
      } catch (err) {
        log.warn({ userId, threadId, err: err instanceof Error ? err.message : err }, 'thread enrichment failed');
      }
    });

    const messageIds = await getMessageIdsWithoutEmbeddings(userId, EMBED_BATCH);
    let embeddings = 0;
    await mapWithConcurrency(messageIds, AI_CONCURRENCY, async (messageId) => {
      try {
        embeddings += await embedMessage(userId, messageId);
      } catch (err) {
        log.warn({ userId, messageId, err: err instanceof Error ? err.message : err }, 'embedding failed');
      }
    });

    log.info({ userId, threads: threadIds.length, embeddings }, 'enrichment batch complete');
    return { threads: threadIds.length, embeddings };
  } finally {
    enriching.delete(userId);
  }
}
