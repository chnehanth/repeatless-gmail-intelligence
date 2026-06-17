import { childLogger } from '../observability/logger.js';

const log = childLogger('retry');

export interface RetryOptions {
  retries?: number;
  /** Base delay in ms; grows exponentially. */
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Decide whether a given error is retryable. */
  isRetryable?: (err: unknown) => boolean;
  /** If the error carries a server-provided Retry-After (seconds), honour it. */
  retryAfterOf?: (err: unknown) => number | undefined;
  label?: string;
  /** Injectable sleep — overridable in tests to avoid real timers. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Full-jitter exponential backoff. */
function backoffDelay(attempt: number, base: number, max: number): number {
  const exp = Math.min(max, base * 2 ** attempt);
  return Math.floor(Math.random() * exp); // full jitter
}

/**
 * Retry an async operation with exponential backoff + full jitter. Honours a
 * server-provided Retry-After when present (e.g. Gmail 429 / quota). Re-throws
 * the last error once retries are exhausted or the error is non-retryable.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    retries = 5,
    baseDelayMs = 250,
    maxDelayMs = 20_000,
    isRetryable = () => true,
    retryAfterOf,
    label = 'op',
    sleep = defaultSleep,
  } = options;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isRetryable(err)) break;

      const retryAfterSec = retryAfterOf?.(err);
      const delay =
        retryAfterSec !== undefined
          ? retryAfterSec * 1000 + backoffDelay(attempt, 100, 1000)
          : backoffDelay(attempt, baseDelayMs, maxDelayMs);

      log.warn(
        { label, attempt: attempt + 1, retries, delayMs: delay, err: errMessage(err) },
        'retrying after transient error',
      );
      await sleep(delay);
    }
  }
  throw lastErr;
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
