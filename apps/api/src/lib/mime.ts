/**
 * Build a raw RFC 2822 message and base64url-encode it for the Gmail send API.
 * Correct In-Reply-To / References headers are essential so replies thread
 * properly in Gmail and other clients.
 */
export interface RawMessageInput {
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  inReplyTo?: string | null;
  references?: string[];
}

function encodeHeaderValue(value: string): string {
  // RFC 2047 encode non-ASCII header values (e.g. names/subjects with accents).
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7F]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}=?=`;
}

export function buildRawMessage(input: RawMessageInput): string {
  const headers: string[] = [];
  headers.push(`From: ${input.from}`);
  headers.push(`To: ${input.to.join(', ')}`);
  if (input.cc && input.cc.length > 0) headers.push(`Cc: ${input.cc.join(', ')}`);
  headers.push(`Subject: ${encodeHeaderValue(input.subject)}`);
  if (input.inReplyTo) headers.push(`In-Reply-To: ${input.inReplyTo}`);
  if (input.references && input.references.length > 0) {
    headers.push(`References: ${input.references.join(' ')}`);
  }
  headers.push('MIME-Version: 1.0');
  headers.push('Content-Type: text/plain; charset="UTF-8"');
  headers.push('Content-Transfer-Encoding: 8bit');

  const raw = `${headers.join('\r\n')}\r\n\r\n${input.body}`;
  return Buffer.from(raw, 'utf8').toString('base64url');
}

/** Prefix a subject with "Re: " for replies unless it already has one. */
export function replySubject(subject: string | null): string {
  const base = subject?.trim() || '(no subject)';
  return /^re:/i.test(base) ? base : `Re: ${base}`;
}
