import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { existsSync } from 'node:fs';
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

  // In production we serve the built SPA from the same origin as the API. This
  // keeps the session cookie first-party (no cross-site cookie config needed)
  // and lets the whole product deploy as a single service. The path can be
  // overridden with WEB_DIST_PATH; if the build isn't present (e.g. local dev
  // where Vite serves the SPA), this is skipped.
  const webDist = process.env.WEB_DIST_PATH ?? path.resolve(process.cwd(), 'apps/web/dist');
  if (existsSync(path.join(webDist, 'index.html'))) {
    app.use(express.static(webDist));
    // SPA fallback: any non-API GET returns index.html so client routes work.
    app.get(/^\/(?!api\/).*/, (_req, res) => {
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
