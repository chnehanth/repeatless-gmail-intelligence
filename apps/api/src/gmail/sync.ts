import type { gmail_v1 } from 'googleapis';
import type { EmailAddress } from '@repeatless/shared';
import { env } from '../config/env.js';
import { childLogger } from '../observability/logger.js';
import { gmailSyncMessages, syncDuration } from '../observability/metrics.js';
import { recordSync } from '../observability/sre.js';
import { mapWithConcurrency } from '../lib/concurrency.js';
import { getAuthedGmailClient } from './session.js';
import { parseMessage, type ParsedMessage } from './parse.js';
import { GmailClient } from './client.js';
import { upsertThread } from '../repos/threads.repo.js';
import { upsertMessage, deleteMessageByGmailId } from '../repos/messages.repo.js';
import { upsertLabels } from '../repos/labels.repo.js';
import { getSyncState, updateSyncState } from '../repos/users.repo.js';
import { enrichUserBacklog } from '../services/enrichment.service.js';

const log = childLogger('gmail:sync');

/** Guards against overlapping sync runs for the same user (per-instance). */
const inFlight = new Set<string>();

export type SyncMode = 'full' | 'incremental';

export interface SyncResult {
  mode: SyncMode;
  threadsProcessed: number;
  messagesUpserted: number;
  historyId: string | null;
}

function dedupeAddresses(addrs: EmailAddress[]): EmailAddress[] {
  const seen = new Map<string, EmailAddress>();
  for (const a of addrs) if (a.email && !seen.has(a.email)) seen.set(a.email, a);
  return [...seen.values()];
}

/** Persist a fully-fetched Gmail thread + its messages, with aggregates. */
async function persistThread(userId: string, thread: gmail_v1.Schema$Thread): Promise<number> {
  const rawMessages = thread.messages ?? [];
  if (rawMessages.length === 0) return 0;
  const parsed: ParsedMessage[] = rawMessages.map(parseMessage);

  // Aggregate thread metadata from its messages.
  const participants = dedupeAddresses(
    parsed.flatMap((m) => [...(m.from ? [m.from] : []), ...m.to, ...m.cc]),
  ).slice(0, 50);
  const lastMessageAt = parsed.reduce((max, m) => (m.internalDate > max ? m.internalDate : max), parsed[0]!.internalDate);
  const isUnread = parsed.some((m) => m.isUnread);
  const subject = parsed[0]?.subject ?? null;
  const gmailThreadId = parsed[0]!.gmailThreadId;

  const threadId = await upsertThread(userId, {
    gmailThreadId,
    subject,
    participants,
    messageCount: parsed.length,
    isUnread,
    lastMessageAt,
  });

  for (const m of parsed) await upsertMessage(userId, threadId, m);
  return parsed.length;
}

/** Collect message ids by listing pages until the configured cap is reached. */
async function collectThreadIds(gmail: GmailClient, cap: number): Promise<string[]> {
  const threadIds = new Set<string>();
  let pageToken: string | undefined;
  let collected = 0;
  do {
    const page = await gmail.listMessages({ pageToken, maxResults: 100 });
    for (const m of page.messages ?? []) {
      if (m.threadId) threadIds.add(m.threadId);
      collected += 1;
      if (cap > 0 && collected >= cap) break;
    }
    pageToken = page.nextPageToken ?? undefined;
    if (cap > 0 && collected >= cap) break;
  } while (pageToken);
  return [...threadIds];
}

async function fullSync(userId: string, gmail: GmailClient): Promise<SyncResult> {
  log.info({ userId }, 'starting full sync');
  await upsertLabels(userId, await gmail.listLabels());

  // Capture the current historyId as the watermark BEFORE backfilling, so any
  // messages arriving during the backfill are caught by the next incremental run.
  const profile = await gmail.getProfile();
  const historyId = profile.historyId ?? null;

  const threadIds = await collectThreadIds(gmail, env.SYNC_INITIAL_MAX_MESSAGES);
  log.info({ userId, threads: threadIds.length }, 'discovered threads for backfill');

  let messagesUpserted = 0;
  await mapWithConcurrency(threadIds, 5, async (tid) => {
    const thread = await gmail.getThread(tid);
    const n = await persistThread(userId, thread);
    messagesUpserted += n;
    gmailSyncMessages.inc({ mode: 'full' }, n);
  });

  await updateSyncState(userId, {
    historyId,
    totalMessages: messagesUpserted,
    lastError: null,
  });

  return { mode: 'full', threadsProcessed: threadIds.length, messagesUpserted, historyId };
}

async function incrementalSync(userId: string, gmail: GmailClient, startHistoryId: string): Promise<SyncResult> {
  log.info({ userId, startHistoryId }, 'starting incremental sync');
  const changedThreadIds = new Set<string>();
  const deletedMessageIds = new Set<string>();
  let newHistoryId = startHistoryId;
  let pageToken: string | undefined;

  do {
    const page = await gmail.listHistory({ startHistoryId, ...(pageToken ? { pageToken } : {}) });
    if (page.historyId) newHistoryId = page.historyId;
    for (const h of page.history ?? []) {
      for (const added of h.messagesAdded ?? []) if (added.message?.threadId) changedThreadIds.add(added.message.threadId);
      for (const labelChange of [...(h.labelsAdded ?? []), ...(h.labelsRemoved ?? [])])
        if (labelChange.message?.threadId) changedThreadIds.add(labelChange.message.threadId);
      for (const del of h.messagesDeleted ?? []) if (del.message?.id) deletedMessageIds.add(del.message.id);
    }
    pageToken = page.nextPageToken ?? undefined;
  } while (pageToken);

  for (const id of deletedMessageIds) await deleteMessageByGmailId(userId, id);

  let messagesUpserted = 0;
  let transientFailures = 0;
  await mapWithConcurrency([...changedThreadIds], 5, async (tid) => {
    try {
      const thread = await gmail.getThread(tid);
      const n = await persistThread(userId, thread);
      messagesUpserted += n;
      gmailSyncMessages.inc({ mode: 'incremental' }, n);
    } catch (err) {
      const status = (err as { cause?: { code?: number } })?.cause?.code;
      if (status === 404) {
        // The thread was deleted between history listing and fetch — benign.
        log.debug({ userId, tid }, 'changed thread no longer exists; skipping');
      } else {
        // Transient failure: we must NOT advance the watermark past this change,
        // or it will never be re-fetched. Count it and hold the watermark below.
        transientFailures += 1;
        log.warn({ userId, tid, err: err instanceof Error ? err.message : err }, 'thread fetch failed; will retry next sync');
      }
    }
  });

  const prev = await getSyncState(userId);
  // Only advance the watermark if every changed thread was processed (or
  // confirmed deleted). On transient failures, keep the previous watermark so
  // the same history range is reprocessed next run — at-least-once delivery.
  const committedHistoryId = transientFailures > 0 ? startHistoryId : newHistoryId;
  await updateSyncState(userId, {
    historyId: committedHistoryId,
    totalMessages: prev.totalMessages + messagesUpserted,
    lastError: transientFailures > 0 ? `${transientFailures} thread(s) failed to sync; will retry` : null,
  });

  return {
    mode: 'incremental',
    threadsProcessed: changedThreadIds.size,
    messagesUpserted,
    historyId: committedHistoryId,
  };
}

/**
 * Orchestrate a sync run. Chooses full vs incremental automatically:
 *   - no stored historyId  -> full backfill
 *   - explicit mode='full' -> full backfill
 *   - otherwise            -> incremental from the watermark
 * Falls back to a full sync if Gmail rejects the historyId as too old (404).
 */
export async function runSync(userId: string, requested: SyncMode = 'incremental'): Promise<SyncResult> {
  if (inFlight.has(userId)) {
    log.info({ userId }, 'sync already in progress; skipping');
    const state = await getSyncState(userId);
    return { mode: requested, threadsProcessed: 0, messagesUpserted: 0, historyId: state.historyId };
  }
  inFlight.add(userId);
  const state = await getSyncState(userId);
  const mode: SyncMode = requested === 'full' || !state.historyId ? 'full' : 'incremental';
  const endTimer = syncDuration.startTimer({ mode });

  try {
    await updateSyncState(userId, { status: mode === 'full' ? 'initial' : 'incremental' });
    const { gmail } = await getAuthedGmailClient(userId);

    let result: SyncResult;
    if (mode === 'full') {
      result = await fullSync(userId, gmail);
    } else {
      try {
        result = await incrementalSync(userId, gmail, state.historyId!);
      } catch (err) {
        const status = (err as { cause?: { code?: number } })?.cause?.code;
        if (status === 404) {
          log.warn({ userId }, 'historyId too old; falling back to full sync');
          result = await fullSync(userId, gmail);
        } else {
          throw err;
        }
      }
    }

    await updateSyncState(userId, { status: 'idle', lastSyncedAt: new Date().toISOString() });
    endTimer({ outcome: 'success' });
    recordSync(true);
    log.info({ userId, ...result }, 'sync completed');

    // Kick off AI enrichment (summaries, categories, embeddings) in the
    // background so the sync endpoint returns quickly. Errors are logged, not
    // propagated — ingestion already succeeded.
    void enrichUserBacklog(userId).catch((err) =>
      log.error({ userId, err: err instanceof Error ? err.message : err }, 'background enrichment failed'),
    );

    return result;
  } catch (err) {
    endTimer({ outcome: 'error' });
    recordSync(false);
    const message = err instanceof Error ? err.message : String(err);
    await updateSyncState(userId, { status: 'error', lastError: message });
    log.error({ userId, err: message }, 'sync failed');
    throw err;
  } finally {
    inFlight.delete(userId);
  }
}
