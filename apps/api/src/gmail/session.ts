import type { OAuth2Client } from 'google-auth-library';
import { authedClient } from './oauth.js';
import { GmailClient } from './client.js';
import { getCredentials, saveCredentials } from '../repos/users.repo.js';
import { childLogger } from '../observability/logger.js';

const log = childLogger('gmail:session');

/**
 * Build an authorized Gmail client for a user. The OAuth2 client refreshes the
 * access token automatically when it expires; we listen for the `tokens` event
 * and persist the refreshed credentials so they survive process restarts.
 */
export async function getAuthedGmailClient(userId: string): Promise<{ gmail: GmailClient; auth: OAuth2Client }> {
  const creds = await getCredentials(userId);
  const auth = authedClient(creds);

  auth.on('tokens', (tokens: import('google-auth-library').Credentials) => {
    // Fire-and-forget persistence; refresh tokens are only sent on first grant.
    saveCredentials(userId, tokens).catch((err) =>
      log.error({ userId, err: err instanceof Error ? err.message : err }, 'failed to persist refreshed tokens'),
    );
  });

  return { gmail: new GmailClient(auth), auth };
}
