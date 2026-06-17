import { describe, expect, it } from 'vitest';
import { parseAddresses, htmlToText, getHeader } from './parse.js';

describe('parseAddresses', () => {
  it('parses a single named address', () => {
    expect(parseAddresses('Jane Doe <jane@acme.com>')).toEqual([{ name: 'Jane Doe', email: 'jane@acme.com' }]);
  });

  it('parses multiple addresses', () => {
    const result = parseAddresses('A <a@x.com>, "Smith, Bob" <bob@y.com>');
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual({ name: 'Smith, Bob', email: 'bob@y.com' });
  });

  it('lowercases emails and handles bare addresses', () => {
    expect(parseAddresses('Plain@Example.COM')).toEqual([{ name: null, email: 'plain@example.com' }]);
  });

  it('returns empty array for null', () => {
    expect(parseAddresses(null)).toEqual([]);
  });
});

describe('htmlToText', () => {
  it('strips tags and decodes entities', () => {
    const html = '<p>Hello&nbsp;<b>world</b></p><script>bad()</script><div>Line&amp;two</div>';
    const text = htmlToText(html);
    expect(text).toContain('Hello world');
    expect(text).toContain('Line&two');
    expect(text).not.toContain('bad()');
  });
});

describe('getHeader', () => {
  it('is case-insensitive', () => {
    const headers = [{ name: 'Message-ID', value: '<abc@x>' }];
    expect(getHeader(headers, 'message-id')).toBe('<abc@x>');
  });
});
