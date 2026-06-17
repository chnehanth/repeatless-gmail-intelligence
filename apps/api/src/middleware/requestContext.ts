import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { runWithContext } from '../observability/context.js';
import { httpInFlight, httpRequestDuration, httpRequestsTotal } from '../observability/metrics.js';
import { recordHttp } from '../observability/sre.js';
import { logger } from '../observability/logger.js';

/**
 * Establishes per-request observability context:
 *   - assigns/propagates an X-Request-Id correlation id
 *   - runs the request inside AsyncLocalStorage so logs/traces are correlated
 *   - records HTTP metrics (traffic, latency, errors) + SLO outcomes on finish
 */
export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('x-request-id');
  const requestId = incoming && incoming.length <= 200 ? incoming : randomUUID();
  res.setHeader('x-request-id', requestId);

  const start = process.hrtime.bigint();
  httpInFlight.inc();

  res.on('finish', () => {
    httpInFlight.dec();
    const durationSec = Number(process.hrtime.bigint() - start) / 1e9;
    // Use the matched route template (not the raw URL) to keep label cardinality bounded.
    const route = (req.route?.path as string | undefined) ?? req.baseUrl + (req.path || '');
    const labels = { method: req.method, route: route || 'unknown', status: String(res.statusCode) };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, durationSec);
    recordHttp(res.statusCode, durationSec * 1000);

    logger.info(
      {
        requestId,
        method: req.method,
        route: labels.route,
        status: res.statusCode,
        durationMs: Math.round(durationSec * 1000),
      },
      'request completed',
    );
  });

  runWithContext({ requestId, userId: null }, () => next());
}
