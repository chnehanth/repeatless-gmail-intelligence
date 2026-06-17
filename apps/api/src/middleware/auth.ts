import type { NextFunction, Request, Response } from 'express';
import { SESSION_COOKIE } from '../config/constants.js';
import { verifyToken } from '../lib/crypto.js';
import { unauthorized } from '../lib/errors.js';
import { setContextUser } from '../observability/context.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

/** Parse the signed session cookie and return the user id, or null. */
export function readSession(req: Request): string | null {
  const raw = (req.cookies?.[SESSION_COOKIE] as string | undefined) ?? null;
  if (!raw) return null;
  const payload = verifyToken(raw);
  if (!payload) return null;
  try {
    const parsed = JSON.parse(payload) as { sub?: string; exp?: number };
    if (!parsed.sub) return null;
    if (parsed.exp && Date.now() > parsed.exp) return null;
    return parsed.sub;
  } catch {
    return null;
  }
}

/** Soft auth: attaches userId if a valid session exists, never rejects. */
export function attachUser(req: Request, _res: Response, next: NextFunction): void {
  const userId = readSession(req);
  if (userId) {
    req.userId = userId;
    setContextUser(userId);
  }
  next();
}

/** Hard auth: rejects with 401 if no valid session. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const userId = req.userId ?? readSession(req);
  if (!userId) {
    next(unauthorized());
    return;
  }
  req.userId = userId;
  setContextUser(userId);
  next();
}

/** Helper for handlers to read the guaranteed-present user id. */
export function currentUserId(req: Request): string {
  if (!req.userId) throw unauthorized();
  return req.userId;
}
