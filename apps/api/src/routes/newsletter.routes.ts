import { Router } from 'express';
import { newsDigestQuerySchema } from '@repeatless/shared';
import { asyncHandler } from '../lib/http.js';
import { currentUserId } from '../middleware/auth.js';
import { buildNewsDigest } from '../services/newsletter.service.js';

export const newsletterRouter: Router = Router();

// GET /news/digest?days=4 — deduplicated news digest from newsletters.
newsletterRouter.get(
  '/news/digest',
  asyncHandler(async (req, res) => {
    const userId = currentUserId(req);
    const { days } = newsDigestQuerySchema.parse(req.query);
    const items = await buildNewsDigest(userId, days);
    res.json({ days, items });
  }),
);
