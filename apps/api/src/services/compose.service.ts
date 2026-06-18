import { z } from 'zod';
import type { ComposeRequest, DraftResponse, ReplyRequest, SendEmailRequest } from '@repeatless/shared';
import { generateText } from '../ai/index.js';
import { composeSystem, replySystem } from '../ai/prompts.js';
import { parseJson } from '../ai/json.js';
import { MAX_BODY_CHARS_FOR_LLM } from '../config/constants.js';
import { truncate } from '../lib/text.js';
import { buildRawMessage, replySubject } from '../lib/mime.js';
import { getMessagesForThread } from '../repos/messages.repo.js';
import { getThread } from '../repos/threads.repo.js';
import { getUserProfile, isDemoUser } from '../repos/users.repo.js';
import { getAuthedGmailClient } from '../gmail/session.js';
import { runSync } from '../gmail/sync.js';
import { badRequest, notFound } from '../lib/errors.js';
import { childLogger } from '../observability/logger.js';

const log = childLogger('service:compose');

const composeOut = z.object({ subject: z.string(), body: z.string() });
const replyOut = z.object({ body: z.string() });

/** Draft a brand-new email from a natural-language prompt. */
export async function draftCompose(_userId: string, req: ComposeRequest): Promise<DraftResponse> {
  const { text } = await generateText([{ role: 'user', content: req.prompt }], {
    operation: 'compose',
    system: composeSystem(req.tone),
    temperature: 0.5,
    json: true,
    maxOutputTokens: 1200,
  });
  const parsed = parseJson(text, composeOut);
  return { to: [], cc: [], subject: parsed.subject.trim(), body: parsed.body.trim() };
}

/**
 * Draft a reply with full thread context. Produces the body plus the threading
 * metadata (recipients, subject, In-Reply-To, References) needed to send it
 * back into the same Gmail thread.
 */
export async function draftReply(userId: string, req: ReplyRequest): Promise<DraftResponse> {
  const thread = await getThread(userId, req.threadId);
  const messages = await getMessagesForThread(userId, req.threadId);
  if (messages.length === 0) throw notFound('Thread has no messages');

  const me = await getUserProfile(userId);

  // Build the chronological transcript for grounding.
  const perMessageBudget = Math.max(400, Math.floor(MAX_BODY_CHARS_FOR_LLM / Math.max(1, messages.length)));
  const transcript = messages
    .map((m, i) => {
      const sender = m.fromAddress?.name ?? m.fromAddress?.email ?? 'Unknown';
      return `--- Message ${i + 1} | ${sender} | ${m.internalDate} ---\n${truncate(m.bodyText ?? m.snippet ?? '', perMessageBudget)}`;
    })
    .join('\n\n');

  const { text } = await generateText(
    [{ role: 'user', content: `Thread so far:\n\n${transcript}\n\n---\nWrite a reply. Instruction: ${req.prompt}` }],
    { operation: 'reply', system: replySystem(req.tone), temperature: 0.5, json: true, maxOutputTokens: 1200 },
  );
  const parsed = parseJson(text, replyOut);

  // Choose the message we're replying to (most recent inbound), and derive BOTH
  // the recipients and the threading headers from that same message so they
  // stay consistent.
  const { target, to, cc } = pickReplyTarget(messages, me.email);

  // Threading headers per RFC 5322: In-Reply-To = target's Message-ID;
  // References = target's References chain + the target's own Message-ID.
  const references = dedupe([...target.references, target.rfcMessageId].filter(Boolean) as string[]);

  return {
    to,
    cc,
    subject: replySubject(thread.subject),
    body: parsed.body.trim(),
    threadId: thread.gmailThreadId,
    ...(target.rfcMessageId ? { inReplyTo: target.rfcMessageId } : {}),
    references,
  };
}

function pickReplyTarget(
  messages: Awaited<ReturnType<typeof getMessagesForThread>>,
  myEmail: string,
): { target: (typeof messages)[number]; to: string[]; cc: string[] } {
  const mine = myEmail.toLowerCase();
  // Reply to the most recent message not sent by me, falling back to the last.
  const lastInbound = [...messages].reverse().find((m) => m.fromAddress && m.fromAddress.email !== mine);
  const target = lastInbound ?? messages[messages.length - 1]!;
  const to = target.fromAddress && target.fromAddress.email !== mine ? [target.fromAddress.email] : [];
  const cc = dedupe(
    [...target.toAddresses, ...target.ccAddresses].map((a) => a.email).filter((e) => e !== mine && !to.includes(e)),
  );
  return { target, to, cc };
}

/** Send an email (new or reply) via Gmail, then trigger an incremental sync so
 * the sent message appears locally. */
export async function sendEmail(userId: string, req: SendEmailRequest): Promise<{ gmailMessageId: string }> {
  if (await isDemoUser(userId)) {
    throw badRequest('Sending is disabled in the demo. Drafting works — connect a real Gmail account to send.');
  }
  if (req.to.length === 0) throw badRequest('At least one recipient is required');
  const me = await getUserProfile(userId);
  const fromName = me.displayName ? `${me.displayName} <${me.email}>` : me.email;

  const raw = buildRawMessage({
    from: fromName,
    to: req.to,
    cc: req.cc,
    subject: req.subject,
    body: req.body,
    inReplyTo: req.inReplyTo ?? null,
    references: req.references ?? [],
  });

  const { gmail } = await getAuthedGmailClient(userId);
  const sent = await gmail.sendRaw(raw, req.threadId);
  log.info({ userId, threadId: req.threadId, gmailMessageId: sent.id }, 'email sent');

  // Reflect the sent message in our store without blocking the response.
  void runSync(userId, 'incremental').catch((err) =>
    log.warn({ userId, err: err instanceof Error ? err.message : err }, 'post-send sync failed'),
  );

  return { gmailMessageId: sent.id ?? '' };
}

function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}
