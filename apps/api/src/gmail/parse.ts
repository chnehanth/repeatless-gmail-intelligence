import type { gmail_v1 } from 'googleapis';
import type { EmailAddress } from '@repeatless/shared';

/**
 * Pure functions that turn a raw Gmail message resource into our domain shape.
 * Kept side-effect-free so they are trivially unit-testable.
 */

function decodeBase64Url(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf8');
}

export function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string | null {
  if (!headers) return null;
  const lower = name.toLowerCase();
  return headers.find((h) => h.name?.toLowerCase() === lower)?.value ?? null;
}

/** Parse an address-list header (From/To/Cc) into structured addresses. */
export function parseAddresses(value: string | null): EmailAddress[] {
  if (!value) return [];
  // Split on commas that are not inside quotes.
  const parts = value.match(/(?:[^,"]+|"[^"]*")+/g) ?? [];
  const result: EmailAddress[] = [];
  for (const raw of parts) {
    const segment = raw.trim();
    if (!segment) continue;
    const angle = segment.match(/^(.*?)<([^>]+)>$/);
    if (angle) {
      const name = angle[1]?.trim().replace(/^"|"$/g, '').trim() || null;
      const email = (angle[2] ?? '').trim().toLowerCase();
      if (email) result.push({ name: name || null, email });
    } else if (segment.includes('@')) {
      result.push({ name: null, email: segment.replace(/[<>]/g, '').trim().toLowerCase() });
    }
  }
  return result;
}

export function parseAddress(value: string | null): EmailAddress | null {
  return parseAddresses(value)[0] ?? null;
}

/** Recursively walk MIME parts and pull out the best text + html bodies. */
export function extractBodies(payload: gmail_v1.Schema$MessagePart | undefined): {
  text: string | null;
  html: string | null;
} {
  let text: string | null = null;
  let html: string | null = null;

  const walk = (part: gmail_v1.Schema$MessagePart | undefined): void => {
    if (!part) return;
    const mime = part.mimeType ?? '';
    const data = part.body?.data;
    if (data) {
      if (mime === 'text/plain' && text === null) text = decodeBase64Url(data);
      else if (mime === 'text/html' && html === null) html = decodeBase64Url(data);
    }
    for (const child of part.parts ?? []) walk(child);
  };
  walk(payload);
  return { text, html };
}

/** Strip HTML to plain text as a fallback when no text/plain part exists. */
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface ParsedMessage {
  gmailMessageId: string;
  gmailThreadId: string;
  rfcMessageId: string | null;
  inReplyTo: string | null;
  references: string[];
  from: EmailAddress | null;
  to: EmailAddress[];
  cc: EmailAddress[];
  subject: string | null;
  snippet: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  labelIds: string[];
  isUnread: boolean;
  internalDate: string; // ISO
}

export function parseMessage(msg: gmail_v1.Schema$Message): ParsedMessage {
  const headers = msg.payload?.headers ?? [];
  const { text, html } = extractBodies(msg.payload);
  const bodyText = text ?? (html ? htmlToText(html) : null);

  const referencesRaw = getHeader(headers, 'References');
  const references = referencesRaw ? referencesRaw.split(/\s+/).filter(Boolean) : [];

  const labelIds = msg.labelIds ?? [];
  const internalMs = msg.internalDate ? Number(msg.internalDate) : Date.now();

  return {
    gmailMessageId: msg.id ?? '',
    gmailThreadId: msg.threadId ?? '',
    rfcMessageId: getHeader(headers, 'Message-ID') ?? getHeader(headers, 'Message-Id'),
    inReplyTo: getHeader(headers, 'In-Reply-To'),
    references,
    from: parseAddress(getHeader(headers, 'From')),
    to: parseAddresses(getHeader(headers, 'To')),
    cc: parseAddresses(getHeader(headers, 'Cc')),
    subject: getHeader(headers, 'Subject'),
    snippet: msg.snippet ?? null,
    bodyText: bodyText?.slice(0, 100_000) ?? null,
    bodyHtml: html?.slice(0, 200_000) ?? null,
    labelIds,
    isUnread: labelIds.includes('UNREAD'),
    internalDate: new Date(internalMs).toISOString(),
  };
}
