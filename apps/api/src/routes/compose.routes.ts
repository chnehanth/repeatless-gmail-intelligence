import { Router } from 'express';
import { composeRequestSchema, replyRequestSchema, sendEmailSchema } from '@repeatless/shared';
import { asyncHandler } from '../lib/http.js';
import { currentUserId } from '../middleware/auth.js';
import { draftCompose, draftReply, sendEmail } from '../services/compose.service.js';

export const composeRouter: Router = Router();

// POST /compose — draft a new email from a prompt.
composeRouter.post(
  '/compose',
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const body = composeRequestSchema.parse(req.body);
    res.json(await draftCompose(userId, body));
  }),
);

// POST /reply — draft a thread-aware reply.
composeRouter.post(
  '/reply',
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const body = replyRequestSchema.parse(req.body);
    res.json(await draftReply(userId, body));
  }),
);

// POST /send — send a (reviewed) email or reply.
composeRouter.post(
  '/send',
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const body = sendEmailSchema.parse(req.body);
    res.json(await sendEmail(userId, body));
  }),
);
