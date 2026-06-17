import { env } from '../config/env.js';

/**
 * Client-side token-bucket throttle for outbound Gmail API calls.
 *
 * Gmail enforces a per-user rate limit and a daily quota (in "quota units").
 * Proactively pacing requests below GMAIL_MAX_RPS keeps us under the limit so
 * 429s are the exception, not the norm. When a 429 *does* occur, the Gmail
 * client layer additionally backs off (see client.ts) — defence in depth.
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSec: number,
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedSec = (now - this.lastRefill) / 1000;
    if (elapsedSec <= 0) return;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSec * this.refillPerSec);
    this.lastRefill = now;
  }

  /** Resolve once a token is available, pacing callers to the configured RPS. */
  async take(): Promise<void> {
    // Bounded loop; in practice resolves within a few iterations.
    for (;;) {
      this.refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      const deficit = 1 - this.tokens;
      const waitMs = Math.ceil((deficit / this.refillPerSec) * 1000);
      await new Promise((r) => setTimeout(r, Math.max(5, waitMs)));
    }
  }
}

/** Shared global throttle. Gmail limits are per-user, but a single OAuth app
 * shares project-level quota, so a process-wide bucket is the safe default. */
export const gmailThrottle = new TokenBucket(env.GMAIL_MAX_RPS, env.GMAIL_MAX_RPS);
