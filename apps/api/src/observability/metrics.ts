import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';
import { env } from '../config/env.js';

/**
 * Prometheus metrics registry. Default process metrics (event loop lag, heap,
 * GC, CPU) plus domain-specific instruments covering the four golden signals:
 * latency, traffic, errors, and saturation.
 */
export const registry = new Registry();
registry.setDefaultLabels({ service: env.OTEL_SERVICE_NAME });

if (env.METRICS_ENABLED) {
  collectDefaultMetrics({ register: registry });
}

// ---- HTTP (traffic + latency + errors) ----------------------------------
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [registry],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [registry],
});

export const httpInFlight = new Gauge({
  name: 'http_requests_in_flight',
  help: 'In-flight HTTP requests (saturation)',
  registers: [registry],
});

// ---- Gmail API -----------------------------------------------------------
export const gmailApiCalls = new Counter({
  name: 'gmail_api_calls_total',
  help: 'Gmail API calls by method and outcome',
  labelNames: ['method', 'outcome'] as const,
  registers: [registry],
});

export const gmailRateLimitHits = new Counter({
  name: 'gmail_rate_limit_hits_total',
  help: 'Number of 429/quota responses from the Gmail API',
  registers: [registry],
});

export const gmailSyncMessages = new Counter({
  name: 'gmail_sync_messages_total',
  help: 'Messages ingested during sync',
  labelNames: ['mode'] as const,
  registers: [registry],
});

export const syncDuration = new Histogram({
  name: 'gmail_sync_duration_seconds',
  help: 'Duration of a sync run',
  labelNames: ['mode', 'outcome'] as const,
  buckets: [0.5, 1, 5, 15, 30, 60, 120, 300],
  registers: [registry],
});

// ---- AI providers --------------------------------------------------------
export const aiRequests = new Counter({
  name: 'ai_requests_total',
  help: 'AI provider calls',
  labelNames: ['provider', 'operation', 'outcome'] as const,
  registers: [registry],
});

export const aiRequestDuration = new Histogram({
  name: 'ai_request_duration_seconds',
  help: 'AI provider call latency',
  labelNames: ['provider', 'operation'] as const,
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 40],
  registers: [registry],
});

export const aiTokensUsed = new Counter({
  name: 'ai_tokens_total',
  help: 'Approximate tokens consumed by AI calls',
  labelNames: ['provider', 'kind'] as const, // kind = prompt|completion
  registers: [registry],
});

export const aiProviderFallbacks = new Counter({
  name: 'ai_provider_fallbacks_total',
  help: 'Times the secondary AI provider was used after the primary failed',
  labelNames: ['operation'] as const,
  registers: [registry],
});

// ---- RAG / chat ----------------------------------------------------------
export const ragRetrievedChunks = new Histogram({
  name: 'rag_retrieved_chunks',
  help: 'Number of chunks retrieved per chat query',
  buckets: [0, 1, 2, 4, 8, 16, 32],
  registers: [registry],
});

export const chatGroundedResponses = new Counter({
  name: 'chat_responses_total',
  help: 'Chat responses by grounding outcome',
  labelNames: ['grounded'] as const, // grounded = true|false (no-context answers)
  registers: [registry],
});
