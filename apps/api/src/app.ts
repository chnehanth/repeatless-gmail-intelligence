import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { API_PREFIX } from './config/constants.js';
import { requestContext } from './middleware/requestContext.js';
import { attachUser, requireAuth } from './middleware/auth.js';
import { createRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { threadsRouter } from './routes/threads.routes.js';
import { syncRouter } from './routes/sync.routes.js';
import { composeRouter } from './routes/compose.routes.js';
import { chatRouter } from './routes/chat.routes.js';
import { newsletterRouter } from './routes/newsletter.routes.js';

/** Build and configure the Express application (no network binding here, so it
 * is unit-testable with supertest). */
export function createApp(): Express {
  const app = express();
  app.set('trust proxy', 1); // correct client IPs behind a proxy/LB

  // Security headers. CSP is relaxed for the JSON API; the SPA sets its own.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.use(
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(requestContext);

  // Operational endpoints (no auth): health, readiness, SLO, metrics.
  app.use(API_PREFIX, healthRouter);

  app.get('/', (_req, res) => {
    res.json({ name: 'Repeatless Gmail Intelligence API', version: '1.0.0', docs: `${API_PREFIX}/health` });
  });

  // Auth flow (mostly public; /me is guarded inside the router).
  app.use(`${API_PREFIX}/auth`, authRouter);

  // Protected API surface.
  const protectedRouter = express.Router();
  protectedRouter.use(attachUser, requireAuth);

  // Heavier AI endpoints get a tighter per-user rate limit to bound cost/abuse.
  const aiLimiter = createRateLimiter({ windowMs: 60_000, max: 30, name: 'ai' });
  protectedRouter.use(['/chat', '/compose', '/reply', '/news/digest'], aiLimiter);

  protectedRouter.use(syncRouter);
  protectedRouter.use(threadsRouter);
  protectedRouter.use(composeRouter);
  protectedRouter.use(chatRouter);
  protectedRouter.use(newsletterRouter);

  app.use(API_PREFIX, protectedRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
