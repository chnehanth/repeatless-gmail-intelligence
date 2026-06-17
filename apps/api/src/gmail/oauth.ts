import { google } from 'googleapis';
import type { OAuth2Client, Credentials } from 'google-auth-library';
import { env } from '../config/env.js';
import { GMAIL_SCOPES } from '../config/constants.js';
import { childLogger } from '../observability/logger.js';

const log = childLogger('gmail:oauth');

/** Create a fresh OAuth2 client (one per request/sync to stay stateless). */
export function createOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_OAUTH_REDIRECT_URI);
}

/** Build the consent-screen URL. `state` carries CSRF protection. */
export function buildAuthUrl(state: string): string {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline', // request a refresh token
    prompt: 'consent', // force refresh token issuance on re-auth
    scope: GMAIL_SCOPES,
    include_granted_scopes: true,
    state,
  });
}

/** Exchange an authorization code for tokens. */
export async function exchangeCode(code: string): Promise<Credentials> {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

/** Build an authorized client from stored credentials. */
export function authedClient(credentials: Credentials): OAuth2Client {
  const client = createOAuthClient();
  client.setCredentials(credentials);
  return client;
}

/** Fetch the Google profile (email + name) for the authenticated user. */
export async function fetchUserInfo(client: OAuth2Client): Promise<{ email: string; name: string | null; picture: string | null }> {
  const oauth2 = google.oauth2({ version: 'v2', auth: client });
  const { data } = await oauth2.userinfo.get();
  if (!data.email) {
    log.error('Google userinfo did not return an email');
    throw new Error('Google account did not return an email address');
  }
  return { email: data.email, name: data.name ?? null, picture: data.picture ?? null };
}
