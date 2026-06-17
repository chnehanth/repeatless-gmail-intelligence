/**
 * Vitest setup: populate the required environment so config/env.ts validates
 * during unit tests. These are dummy values — unit tests only exercise pure
 * logic and never make real network calls.
 */
const defaults: Record<string, string> = {
  NODE_ENV: 'test',
  SESSION_SECRET: 'test-session-secret-that-is-at-least-32-chars-long',
  TOKEN_ENCRYPTION_KEY: '0'.repeat(64),
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  GOOGLE_OAUTH_REDIRECT_URI: 'http://localhost:4000/api/v1/auth/google/callback',
  SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/repeatless_test',
  GEMINI_API_KEY: 'test-gemini-key',
  NIM_API_KEY: 'test-nim-key',
  EMBEDDING_DIMENSIONS: '768',
};

for (const [key, value] of Object.entries(defaults)) {
  if (!process.env[key]) process.env[key] = value;
}
