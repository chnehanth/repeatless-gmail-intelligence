import { Router } from 'express';
import { asyncHandler } from '../lib/http.js';
import { liveness, readiness } from '../observability/health.js';
import { getSloReport } from '../observability/sre.js';
import { registry } from '../observability/metrics.js';
import { env } from '../config/env.js';

/**
 * Operational endpoints. Mounted at the API root (not behind auth) so probes,
 * load balancers, and Prometheus can reach them.
 */
export const healthRouter: Router = Router();

// Liveness — process is up. Use for k8s livenessProbe / uptime checks.
healthRouter.get('/health', (_req, res) => {
  res.json(liveness());
});

// Readiness — dependencies are reachable. Use for k8s readinessProbe / LB.
healthRouter.get(
  '/health/ready',
  asyncHandler(async (_req, res) => {
    const report = await readiness();
    res.status(report.status === 'ok' ? 200 : 503).json(report);
  }),
);

// SRE — SLO compliance + error budgets.
healthRouter.get('/health/slo', (_req, res) => {
  const report = getSloReport();
  res.status(report.healthy ? 200 : 503).json(report);
});

// Prometheus scrape endpoint.
healthRouter.get('/metrics', asyncHandler(async (_req, res) => {
  if (!env.METRICS_ENABLED) {
    res.status(404).end();
    return;
  }
  res.setHeader('Content-Type', registry.contentType);
  res.end(await registry.metrics());
}));
