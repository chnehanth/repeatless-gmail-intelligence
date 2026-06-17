// Tracing MUST be initialised before any instrumented module is imported.
import { startTracing, shutdownTracing } from './observability/tracing.js';
startTracing();

import type { Server } from 'node:http';
import { env } from './config/env.js';
import { logger } from './observability/logger.js';
import { createApp } from './app.js';
import { startScheduler, stopScheduler } from './workers/scheduler.js';

const app = createApp();

const server: Server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV, embeddingProvider: env.EMBEDDING_PROVIDER },
    `Repeatless API listening on ${env.API_BASE_URL}`,
  );
  startScheduler();
});

// ---- Graceful shutdown ---------------------------------------------------
let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down gracefully');
  stopScheduler();

  const forceExit = setTimeout(() => {
    logger.error('forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(async () => {
    await shutdownTracing();
    clearTimeout(forceExit);
    logger.info('shutdown complete');
    process.exit(0);
  });
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => void shutdown(signal));
}

// Last-resort safety nets: log and exit so an orchestrator can restart us.
process.on('unhandledRejection', (reason) => {
  logger.error({ reason: reason instanceof Error ? reason.message : reason }, 'unhandled promise rejection');
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err: err.message, stack: err.stack }, 'uncaught exception');
  void shutdown('uncaughtException');
});
