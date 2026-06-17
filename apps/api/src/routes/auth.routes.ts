import { Router } from 'express';
import { asyncHandler } from '../lib/http.js';
import { env, isProd } from '../config/env.js';
import { OAUTH_STATE_COOKIE, SESSION_COOKIE } from '../config/constants.js';
import { completeOAuth, startOAuth, SESSION_MAX_AGE_MS } from '../services/auth.service.js';
import { getUserProfile } from '../repos/users.repo.js';
import { attachUser, currentUserId, requireAuth } from '../middleware/auth.js';
import { badRequest } from '../lib/errors.js';

export const authRouter: Router = Router();

const stateCookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  maxAge: 10 * 60 * 1000,
  path: '/',
};
const sessionCookieOpts = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax' as const,
  maxAge: SESSION_MAX_AGE_MS,
  path: '/',
};

// Begin OAuth: set a CSRF state cookie and redirect to Google's consent screen.
authRouter.get('/google', (_req, res) => {
  const { url, state } = startOAuth();
  res.cookie(OAUTH_STATE_COOKIE, state, stateCookieOpts);
  res.redirect(url);
});

// OAuth callback: verify state, exchange code, set session, redirect to the app.
authRouter.get(
  '/google/callback',
  asyncHandler(async (req, res) => {
    const { code, state, error } = req.query as { code?: string; state?: string; error?: string };
    if (error) {
      res.redirect(`${env.WEB_BASE_URL}/?auth_error=${encodeURIComponent(error)}`);
      return;
    }
    const expectedState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;
    if (!state || !expectedState || state !== expectedState) {
      throw badRequest('Invalid OAuth state — possible CSRF. Please try signing in again.');
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });

    const { sessionToken } = await completeOAuth(code ?? '');
    res.cookie(SESSION_COOKIE, sessionToken, sessionCookieOpts);
    res.redirect(`${env.WEB_BASE_URL}/inbox`);
  }),
);

// Current user (soft auth — returns 401 if not signed in).
authRouter.get(
  '/me',
  attachUser,
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = await getUserProfile(currentUserId(req));
    res.json(profile);
  }),
);

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
});
