import { Router } from 'express';
import { triggerSyncSchema } from '@repeatless/shared';
import { asyncHandler } from '../lib/http.js';
import { currentUserId } from '../middleware/auth.js';
import { runSync } from '../gmail/sync.js';
import { getSyncState, getUserProfile } from '../repos/users.repo.js';
import { countThreads } from '../repos/threads.repo.js';
import { childLogger } from '../observability/logger.js';

const log = childLogger('route:sync');
export const syncRouter: Router = Router();

// POST /sync — trigger a sync. Runs in the background; returns immediately.
syncRouter.post(
  '/sync',
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const { mode } = triggerSyncSchema.parse(req.body ?? {});
    // Fire-and-forget: the client polls /sync/status for progress.
    void runSync(userId, mode).catch((err) =>
      log.error({ userId, err: err instanceof Error ? err.message : err }, 'triggered sync failed'),
    );
    res.status(202).json({ accepted: true, mode });
  }),
);

// GET /sync/status — current sync state + counts.
syncRouter.get(
  '/sync/status',
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const [state, profile, threadCount] = await Promise.all([
      getSyncState(userId),
      getUserProfile(userId),
      countThreads(userId),
    ]);
    res.json({
      status: state.status,
      lastSyncedAt: state.lastSyncedAt,
      lastError: state.lastError,
      totalMessages: state.totalMessages,
      threadCount,
      email: profile.email,
    });
  }),
);
