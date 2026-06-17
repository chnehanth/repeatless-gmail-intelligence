import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { env } from '../config/env.js';

/**
 * OpenTelemetry distributed tracing. Auto-instruments HTTP, Express, pg, and
 * outbound fetch/https (Gmail, Gemini, NIM) so a single trace spans the whole
 * request → DB → AI fan-out. Exporting is enabled only when an OTLP endpoint is
 * configured; otherwise the SDK is not started (zero overhead in local dev).
 *
 * MUST be initialised before any instrumented module is imported — see
 * src/index.ts which imports this first.
 */
let sdk: NodeSDK | null = null;

export function startTracing(): void {
  if (!env.OTEL_EXPORTER_OTLP_ENDPOINT) return;

  sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: env.OTEL_SERVICE_NAME,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: env.NODE_ENV,
    }),
    traceExporter: new OTLPTraceExporter({
      url: `${env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/, '')}/v1/traces`,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // fs instrumentation is noisy and rarely useful here.
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
}

export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown().catch(() => undefined);
    sdk = null;
  }
}
