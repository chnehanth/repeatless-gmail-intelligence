import { childLogger } from './logger.js';

/**
 * Lightweight in-process SRE telemetry: tracks Service Level Indicators (SLIs)
 * against Service Level Objectives (SLOs) and computes a rolling error budget.
 *
 * This is intentionally dependency-free and in-memory — for a single instance
 * it gives an at-a-glance reliability view at /api/v1/health/slo and feeds the
 * Prometheus metrics for long-term storage/alerting. In a multi-instance
 * deployment, treat Prometheus + a recording rule as the source of truth; this
 * module is the local, real-time mirror.
 */

const log = childLogger('sre');

export interface SloDefinition {
  name: string;
  /** Target as a fraction, e.g. 0.99 = 99%. */
  objective: number;
  /** Latency SLO: requests faster than this (ms) count as "good". */
  latencyThresholdMs?: number;
  description: string;
}

interface SliWindow {
  good: number;
  total: number;
}

export interface SloReport {
  name: string;
  description: string;
  objective: number;
  observed: number | null;
  errorBudgetRemaining: number | null;
  good: number;
  total: number;
  healthy: boolean;
}

/** SLO catalogue for the platform. Tune objectives per environment. */
export const SLOS: Record<string, SloDefinition> = {
  api_availability: {
    name: 'api_availability',
    objective: 0.995,
    description: 'Fraction of API requests that did not return a 5xx error.',
  },
  api_latency: {
    name: 'api_latency',
    objective: 0.95,
    latencyThresholdMs: 1000,
    description: 'Fraction of API requests served in under 1s.',
  },
  ai_success: {
    name: 'ai_success',
    objective: 0.98,
    description: 'Fraction of AI provider operations that succeeded (incl. fallback).',
  },
  sync_success: {
    name: 'sync_success',
    objective: 0.99,
    description: 'Fraction of Gmail sync runs that completed without error.',
  },
};

const windows = new Map<string, SliWindow>();
for (const key of Object.keys(SLOS)) windows.set(key, { good: 0, total: 0 });

function record(slo: string, good: boolean): void {
  const w = windows.get(slo);
  if (!w) return;
  w.total += 1;
  if (good) w.good += 1;
}

/** Record an HTTP request outcome against availability + latency SLOs. */
export function recordHttp(statusCode: number, durationMs: number): void {
  record('api_availability', statusCode < 500);
  const threshold = SLOS.api_latency?.latencyThresholdMs ?? 1000;
  record('api_latency', durationMs <= threshold);
}

export function recordAi(success: boolean): void {
  record('ai_success', success);
}

export function recordSync(success: boolean): void {
  record('sync_success', success);
}

function reportFor(def: SloDefinition): SloReport {
  const w = windows.get(def.name) ?? { good: 0, total: 0 };
  const observed = w.total === 0 ? null : w.good / w.total;
  let errorBudgetRemaining: number | null = null;
  if (observed !== null) {
    const allowedFailureRate = 1 - def.objective;
    const actualFailureRate = 1 - observed;
    // 1.0 = full budget; <0 = budget exhausted (worse than objective).
    errorBudgetRemaining =
      allowedFailureRate === 0 ? (actualFailureRate === 0 ? 1 : 0) : 1 - actualFailureRate / allowedFailureRate;
  }
  return {
    name: def.name,
    description: def.description,
    objective: def.objective,
    observed,
    errorBudgetRemaining,
    good: w.good,
    total: w.total,
    healthy: observed === null ? true : observed >= def.objective,
  };
}

export function getSloReport(): { healthy: boolean; slos: SloReport[] } {
  const slos = Object.values(SLOS).map(reportFor);
  const healthy = slos.every((s) => s.healthy);
  return { healthy, slos };
}

/** Reset windows — exposed for tests and optional periodic rollover. */
export function resetSlos(): void {
  for (const key of windows.keys()) windows.set(key, { good: 0, total: 0 });
  log.debug('SLO windows reset');
}
