import { buildAuthUrl, exchangeCode, authedClient, fetchUserInfo } from '../gmail/oauth.js';
import { saveCredentials, upsertUser, getDemoUserId } from '../repos/users.repo.js';
import { runSync } from '../gmail/sync.js';
import { signToken, randomToken } from '../lib/crypto.js';
import { badRequest, notFound } from '../lib/errors.js';
import { env } from '../config/env.js';
import { childLogger } from '../observability/logger.js';

const log = childLogger('service:auth');

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function startOAuth(): { url: string; state: string } {
  const state = randomToken(24);
  return { url: buildAuthUrl(state), state };
}

/**
 * Complete the OAuth callback: exchange the code, identify the user, persist
 * encrypted credentials, and kick off the initial backfill sync. Returns a
 * signed session token for the session cookie.
 */
export async function completeOAuth(code: string): Promise<{ userId: string; sessionToken: string }> {
  if (!code) throw badRequest('Missing authorization code');

  const tokens = await exchangeCode(code);
  if (!tokens.refresh_token && !tokens.access_token) {
    throw badRequest('Google did not return usable tokens');
  }

  const client = authedClient(tokens);
  const info = await fetchUserInfo(client);

  const user = await upsertUser({ email: info.email, displayName: info.name, avatarUrl: info.picture });
  await saveCredentials(user.id, tokens);

  // Initial backfill runs in the background so the user lands in the app fast.
  void runSync(user.id, 'full').catch((err) =>
    log.error({ userId: user.id, err: err instanceof Error ? err.message : err }, 'initial sync failed'),
  );

  const expMs = Date.now() + SESSION_TTL_MS;
  const sessionToken = signToken(JSON.stringify({ sub: user.id, exp: expMs }));
  log.info({ userId: user.id, email: info.email }, 'user authenticated via Google OAuth');
  return { userId: user.id, sessionToken };
}

/**
 * Issue a session for the seeded demo account — no Google OAuth. Enabled only
 * when DEMO_MODE is on; lets evaluators explore a populated inbox + chatbot
 * without a Google sign-in or being on the OAuth test-user allow-list.
 */
export async function loginDemo(): Promise<{ userId: string; sessionToken: string }> {
  if (!env.DEMO_MODE) throw notFound('Demo mode is disabled');
  const userId = await getDemoUserId(env.DEMO_USER_EMAIL);
  if (!userId) throw notFound('Demo account is not seeded');
  const expMs = Date.now() + SESSION_TTL_MS;
  const sessionToken = signToken(JSON.stringify({ sub: userId, exp: expMs }));
  log.info({ userId }, 'demo session issued');
  return { userId, sessionToken };
}

export const SESSION_MAX_AGE_MS = SESSION_TTL_MS;
