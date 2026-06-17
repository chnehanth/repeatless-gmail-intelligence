import { describe, expect, it } from 'vitest';
import { encryptSecret, decryptSecret, signToken, verifyToken } from './crypto.js';

describe('encryptSecret / decryptSecret', () => {
  it('round-trips a value', () => {
    const secret = 'super-secret-refresh-token';
    const enc = encryptSecret(secret);
    expect(enc).not.toContain(secret);
    expect(decryptSecret(enc)).toBe(secret);
  });

  it('produces different ciphertext each time (random IV)', () => {
    expect(encryptSecret('x')).not.toBe(encryptSecret('x'));
  });

  it('rejects tampered ciphertext', () => {
    const enc = encryptSecret('hello');
    const parts = enc.split('.');
    const tampered = `${parts[0]}.${parts[1]}.${Buffer.from('garbage').toString('base64')}`;
    expect(() => decryptSecret(tampered)).toThrow();
  });
});

describe('signToken / verifyToken', () => {
  it('verifies a valid token', () => {
    const payload = JSON.stringify({ sub: 'user-1' });
    expect(verifyToken(signToken(payload))).toBe(payload);
  });

  it('rejects a tampered token', () => {
    const token = signToken('payload');
    expect(verifyToken(`${token}x`)).toBeNull();
  });

  it('rejects malformed input', () => {
    expect(verifyToken('not-a-token')).toBeNull();
  });
});
