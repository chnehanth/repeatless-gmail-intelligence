import { env } from '../config/env.js';
import { childLogger } from '../observability/logger.js';
import { runWithContext } from '../observability/context.js';
import { randomUUID } from 'node:crypto';
import { listSyncableUserIds } from '../repos/users.repo.js';
import { runSync } from '../gmail/sync.js';

const log = childLogger('worker:scheduler');

let timer: NodeJS.Timeout | null = null;
let running = false;

/**
 * Periodic incremental-sync scheduler. Every SYNC_INTERVAL_SECONDS it runs an
 * incremental sync for each connected user. Runs are serialised per tick and
 * guarded against overlap; per-user overlap is additionally guarded in runSync.
 *
 * For multi-instance deployments this should be replaced by a real job queue
 * (e.g. pg-boss / BullMQ) with a distributed lock so only one worker syncs a
 * given user. Documented in Architecture.md.
 */
async function tick(): Promise<void> {
  if (running) {
    log.debug('previous scheduler tick still running; skipping');
    return;
  }
  running = true;
  await runWithContext({ requestId: `sched-${randomUUID()}`, userId: null, operation: 'scheduler.tick' }, async () => {
    try {
      const userIds = await listSyncableUserIds();
      log.info({ users: userIds.length }, 'scheduler tick: syncing connected users');
      for (const userId of userIds) {
        try {
          await runSync(userId, 'incremental');
        } catch (err) {
          log.error({ userId, err: err instanceof Error ? err.message : err }, 'scheduled sync failed for user');
        }
      }
    } catch (err) {
      log.error({ err: err instanceof Error ? err.message : err }, 'scheduler tick failed');
    } finally {
      running = false;
    }
  });
}

export function startScheduler(): void {
  if (timer) return;
  const intervalMs = env.SYNC_INTERVAL_SECONDS * 1000;
  timer = setInterval(() => void tick(), intervalMs);
  timer.unref(); // don't keep the process alive solely for the scheduler
  log.info({ intervalSeconds: env.SYNC_INTERVAL_SECONDS }, 'background sync scheduler started');
}

export function stopScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
