import crypto from 'node:crypto';
import { env } from '../config/env.js';

/**
 * AES-256-GCM encryption for OAuth refresh tokens at rest. The key comes from
 * TOKEN_ENCRYPTION_KEY (32 bytes / 64 hex chars). Format of the stored value:
 *   base64(iv).base64(authTag).base64(ciphertext)
 *
 * GCM provides confidentiality + integrity, so a tampered ciphertext fails to
 * decrypt rather than silently returning garbage.
 */
const KEY = Buffer.from(env.TOKEN_ENCRYPTION_KEY, 'hex');
const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join('.');
}

export function decryptSecret(payload: string): string {
  const parts = payload.split('.');
  if (parts.length !== 3) throw new Error('Malformed encrypted payload');
  const [ivB64, tagB64, dataB64] = parts as [string, string, string];
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

/** HMAC-SHA256 signed token: `payload.signature`. Used for session cookies. */
export function signToken(payload: string): string {
  const sig = crypto.createHmac('sha256', env.SESSION_SECRET).update(payload).digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${sig}`;
}

export function verifyToken(token: string): string | null {
  const idx = token.lastIndexOf('.');
  if (idx <= 0) return null;
  const payloadB64 = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  let payload: string;
  try {
    payload = Buffer.from(payloadB64, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  const expected = crypto.createHmac('sha256', env.SESSION_SECRET).update(payload).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return payload;
}

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}
