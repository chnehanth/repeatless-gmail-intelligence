import pino, { type Logger } from 'pino';
import { env, isProd } from '../config/env.js';
import { getContext } from './context.js';

/**
 * Structured logging with pino. Every log line is automatically enriched with
 * the current request id and user id (via AsyncLocalStorage) through a mixin,
 * so logs are correlatable end-to-end without manual plumbing.
 *
 * Secrets are redacted defensively at the pino layer as a last line of
 * defence — application code should never log them in the first place.
 */
const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  '*.access_token',
  '*.refresh_token',
  '*.refresh_token_enc',
  '*.access_token_enc',
  '*.password',
  '*.apiKey',
  '*.api_key',
  'env.GEMINI_API_KEY',
  'env.NIM_API_KEY',
  'env.SUPABASE_SERVICE_ROLE_KEY',
  'env.GOOGLE_CLIENT_SECRET',
  'env.TOKEN_ENCRYPTION_KEY',
  'env.SESSION_SECRET',
];

export const logger: Logger = pino({
  level: env.LOG_LEVEL,
  base: { service: env.OTEL_SERVICE_NAME, env: env.NODE_ENV },
  redact: { paths: redactPaths, censor: '[REDACTED]' },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Inject correlation fields into every log line within a request.
  mixin() {
    const ctx = getContext();
    if (!ctx) return {};
    const fields: Record<string, unknown> = { requestId: ctx.requestId };
    if (ctx.userId) fields.userId = ctx.userId;
    if (ctx.operation) fields.operation = ctx.operation;
    return fields;
  },
  transport:
    env.LOG_PRETTY && !isProd
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
      : undefined,
});

/** Create a child logger bound to a module/component name. */
export function childLogger(component: string, bindings: Record<string, unknown> = {}): Logger {
  return logger.child({ component, ...bindings });
}
