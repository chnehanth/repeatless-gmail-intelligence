import type { NextFunction, Request, Response } from 'express';
import { rateLimited } from '../lib/errors.js';

/**
 * Simple in-memory sliding-window rate limiter to protect expensive endpoints
 * (AI/chat) from abuse and runaway client loops. Keyed by user id when
 * authenticated, else by client IP.
 *
 * Note: in-memory state is per-instance. For multi-instance deployments back
 * this with Redis (e.g. a token-bucket Lua script); the interface stays the
 * same. Documented in Architecture.md.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter(opts: { windowMs: number; max: number; name: string }) {
  const buckets = new Map<string, Bucket>();

  // Periodic cleanup so the map does not grow unbounded.
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
  }, opts.windowMs).unref();
  void sweep;

  return function rateLimit(req: Request, res: Response, next: NextFunction): void {
    const key = `${opts.name}:${req.userId ?? req.ip ?? 'anon'}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + opts.windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;

    const remaining = Math.max(0, opts.max - bucket.count);
    res.setHeader('X-RateLimit-Limit', String(opts.max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > opts.max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      next(rateLimited('Too many requests. Please slow down.', retryAfter));
      return;
    }
    next();
  };
}
