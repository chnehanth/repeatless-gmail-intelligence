import { checkDbHealth } from '../db/supabase.js';
import { env } from '../config/env.js';

/**
 * Health/readiness probes.
 *   - liveness:  is the process up? (cheap, no dependencies)
 *   - readiness: can it serve traffic? (checks critical dependencies)
 */
export interface DependencyHealth {
  name: string;
  status: 'up' | 'down';
  critical: boolean;
  latencyMs?: number;
  detail?: string;
}

export interface ReadinessReport {
  status: 'ok' | 'degraded';
  uptimeSeconds: number;
  version: string;
  dependencies: DependencyHealth[];
}

const startedAt = Date.now();
const VERSION = process.env.npm_package_version ?? '1.0.0';

async function timed(name: string, critical: boolean, fn: () => Promise<boolean>): Promise<DependencyHealth> {
  const t0 = Date.now();
  try {
    const ok = await fn();
    return { name, critical, status: ok ? 'up' : 'down', latencyMs: Date.now() - t0 };
  } catch (err) {
    return {
      name,
      critical,
      status: 'down',
      latencyMs: Date.now() - t0,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Liveness — always cheap. */
export function liveness(): { status: 'ok'; uptimeSeconds: number } {
  return { status: 'ok', uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000) };
}

/** Readiness — verifies critical dependencies. Non-critical checks (optional
 * AI providers) are reported but do not flip the overall status. */
export async function readiness(): Promise<ReadinessReport> {
  const dependencies = await Promise.all([
    timed('database', true, checkDbHealth),
    // Config presence checks (cheap) — confirms credentials are wired without
    // burning provider quota on every probe.
    timed('gemini_config', false, async () => Boolean(env.GEMINI_API_KEY)),
    timed('nim_config', false, async () => Boolean(env.NIM_API_KEY)),
    timed('gmail_config', false, async () => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)),
  ]);

  const criticalDown = dependencies.some((d) => d.critical && d.status === 'down');
  return {
    status: criticalDown ? 'degraded' : 'ok',
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    version: VERSION,
    dependencies,
  };
}
