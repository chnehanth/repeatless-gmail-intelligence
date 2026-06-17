import { describe, expect, it } from 'vitest';
import { buildRawMessage, replySubject } from './mime.js';

function decode(raw: string): string {
  return Buffer.from(raw, 'base64url').toString('utf8');
}

describe('buildRawMessage', () => {
  it('includes threading headers for replies', () => {
    const raw = buildRawMessage({
      from: 'me@x.com',
      to: ['a@y.com'],
      subject: 'Re: Hello',
      body: 'Hi there',
      inReplyTo: '<msg-1@y.com>',
      references: ['<msg-0@y.com>', '<msg-1@y.com>'],
    });
    const text = decode(raw);
    expect(text).toContain('In-Reply-To: <msg-1@y.com>');
    expect(text).toContain('References: <msg-0@y.com> <msg-1@y.com>');
    expect(text).toContain('To: a@y.com');
    expect(text).toMatch(/\r\n\r\nHi there$/);
  });

  it('RFC2047-encodes non-ASCII subjects', () => {
    const raw = buildRawMessage({ from: 'm@x.com', to: ['a@y.com'], subject: 'Café ☕', body: 'b' });
    expect(decode(raw)).toContain('Subject: =?UTF-8?B?');
  });

  it('omits Cc when empty', () => {
    const raw = buildRawMessage({ from: 'm@x.com', to: ['a@y.com'], subject: 'S', body: 'b' });
    expect(decode(raw)).not.toContain('Cc:');
  });
});

describe('replySubject', () => {
  it('adds Re: prefix once', () => {
    expect(replySubject('Hello')).toBe('Re: Hello');
    expect(replySubject('Re: Hello')).toBe('Re: Hello');
    expect(replySubject('RE: Hello')).toBe('RE: Hello');
  });

  it('handles null subject', () => {
    expect(replySubject(null)).toBe('Re: (no subject)');
  });
});
