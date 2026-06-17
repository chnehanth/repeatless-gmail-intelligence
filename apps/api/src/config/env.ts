import { z } from 'zod';

/**
 * Centralised, validated configuration. The process refuses to boot if
 * required variables are missing or malformed — fail fast, never run with a
 * half-configured surface. Access config ONLY through the exported `env`.
 */

const booleanString = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');

const csv = z
  .string()
  .transform((v) => v.split(',').map((s) => s.trim()).filter(Boolean));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),
  WEB_BASE_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: csv.default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  LOG_PRETTY: booleanString.default('false'),

  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'TOKEN_ENCRYPTION_KEY must be 64 hex chars (32 bytes)'),

  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url(),

  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),

  GEMINI_API_KEY: z.string().min(1),
  GEMINI_CHAT_MODEL: z.string().default('gemini-1.5-flash'),
  GEMINI_EMBEDDING_MODEL: z.string().default('text-embedding-004'),

  NIM_API_KEY: z.string().min(1),
  NIM_BASE_URL: z.string().url().default('https://integrate.api.nvidia.com/v1'),
  NIM_CHAT_MODEL: z.string().default('meta/llama-3.1-8b-instruct'),
  NIM_EMBEDDING_MODEL: z.string().default('nvidia/nv-embedqa-e5-v5'),

  EMBEDDING_DIMENSIONS: z.coerce.number().int().positive().default(768),
  EMBEDDING_PROVIDER: z.enum(['gemini', 'nim']).default('gemini'),

  SYNC_INITIAL_MAX_MESSAGES: z.coerce.number().int().min(0).default(2000),
  GMAIL_MAX_RPS: z.coerce.number().int().positive().default(8),
  SYNC_INTERVAL_SECONDS: z.coerce.number().int().positive().default(120),

  METRICS_ENABLED: booleanString.default('true'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional().default(''),
  OTEL_SERVICE_NAME: z.string().default('repeatless-api'),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    // Use console here: the logger depends on validated env, so it may not exist yet.
    console.error(`\n✗ Invalid environment configuration:\n${issues}\n`);
    process.exit(1);
  }
  return parsed.data;
}

export const env: Env = loadEnv();

export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
