import { Router } from 'express';
import { chatRequestSchema } from '@repeatless/shared';
import { asyncHandler } from '../lib/http.js';
import { currentUserId } from '../middleware/auth.js';
import { answerQuestion } from '../services/chat.service.js';
import { listSessions, getRecentMessages } from '../repos/chat.repo.js';

export const chatRouter: Router = Router();

// POST /chat — ask the email knowledge-base agent a question.
chatRouter.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const body = chatRequestSchema.parse(req.body);
    res.json(await answerQuestion(userId, body));
  }),
);

// GET /chat/sessions — list past conversations.
chatRouter.get(
  '/chat/sessions',
  asyncHandler(async (req, res) => {
    res.json({ sessions: await listSessions(currentUserId(req)) });
  }),
);

// GET /chat/sessions/:id — full message history for a conversation.
chatRouter.get(
  '/chat/sessions/:id',
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const messages = await getRecentMessages(userId, req.params.id!, 200);
    res.json({ sessionId: req.params.id, messages });
  }),
);
