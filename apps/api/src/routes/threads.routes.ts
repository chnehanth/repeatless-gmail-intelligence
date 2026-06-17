import { Router } from 'express';
import { listThreadsQuerySchema } from '@repeatless/shared';
import { asyncHandler } from '../lib/http.js';
import { currentUserId } from '../middleware/auth.js';
import { listThreads, getThread } from '../repos/threads.repo.js';
import { getMessagesForThread } from '../repos/messages.repo.js';
import { listLabels } from '../repos/labels.repo.js';
import { summarizeThread } from '../services/summarization.service.js';
import { categorizeThread } from '../services/categorization.service.js';

export const threadsRouter: Router = Router();

// GET /threads — paginated, filterable thread list.
threadsRouter.get(
  '/threads',
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const q = listThreadsQuerySchema.parse(req.query);
    const result = await listThreads(userId, {
      limit: q.limit,
      ...(q.cursor ? { cursor: q.cursor } : {}),
      ...(q.category ? { category: q.category } : {}),
      ...(q.unreadOnly !== undefined ? { unreadOnly: q.unreadOnly } : {}),
      ...(q.search ? { search: q.search } : {}),
    });
    res.json(result);
  }),
);

// GET /threads/:id — thread with its full message list.
threadsRouter.get(
  '/threads/:id',
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const thread = await getThread(userId, req.params.id!);
    const messages = await getMessagesForThread(userId, thread.id);
    res.json({ ...thread, messages });
  }),
);

// POST /threads/:id/summarize — (re)generate the thread summary on demand.
threadsRouter.post(
  '/threads/:id/summarize',
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const thread = await getThread(userId, req.params.id!);
    const summary = await summarizeThread(userId, thread.id);
    res.json({ summary });
  }),
);

// POST /threads/:id/categorize — (re)classify the thread on demand.
threadsRouter.post(
  '/threads/:id/categorize',
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const thread = await getThread(userId, req.params.id!);
    const result = await categorizeThread(userId, thread.id);
    res.json(result);
  }),
);

// GET /labels — Gmail labels synced for this user.
threadsRouter.get(
  '/labels',
  asyncHandler(async (req, res) => {
    res.json({ labels: await listLabels(currentUserId(req)) });
  }),
);
