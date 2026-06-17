import type { EmailMessage } from '@repeatless/shared';
import { generateText } from '../ai/index.js';
import { EMAIL_SUMMARY_SYSTEM, THREAD_SUMMARY_SYSTEM } from '../ai/prompts.js';
import { MAX_BODY_CHARS_FOR_LLM } from '../config/constants.js';
import { truncate } from '../lib/text.js';
import { getMessagesForThread, setMessageSummary } from '../repos/messages.repo.js';
import { setThreadSummary } from '../repos/threads.repo.js';
import { childLogger } from '../observability/logger.js';

const log = childLogger('service:summarization');

function fmtSender(m: EmailMessage): string {
  if (!m.fromAddress) return 'Unknown';
  return m.fromAddress.name ?? m.fromAddress.email;
}

/** Summarise one message in isolation (used for list previews). */
export async function summarizeMessage(message: EmailMessage): Promise<string> {
  const body = truncate(message.bodyText ?? message.snippet ?? '', MAX_BODY_CHARS_FOR_LLM);
  if (!body.trim()) return message.snippet ?? '';
  const content = `Subject: ${message.subject ?? '(none)'}\nFrom: ${fmtSender(message)}\n\n${body}`;
  const { text } = await generateText([{ role: 'user', content }], {
    operation: 'summarize.email',
    system: EMAIL_SUMMARY_SYSTEM,
    temperature: 0.2,
    maxOutputTokens: 120,
  });
  return text.trim();
}

/**
 * Summarise a whole thread with full context. The model receives every message
 * in chronological order so a reply is understood relative to the whole
 * conversation, not in isolation (a core requirement).
 */
export async function summarizeThread(userId: string, threadId: string): Promise<string> {
  const messages = await getMessagesForThread(userId, threadId);
  if (messages.length === 0) return '';

  // Budget the body length per message so long threads still fit the context.
  const perMessageBudget = Math.max(500, Math.floor(MAX_BODY_CHARS_FOR_LLM / Math.max(1, messages.length)));
  const transcript = messages
    .map((m, i) => {
      const body = truncate(m.bodyText ?? m.snippet ?? '', perMessageBudget);
      return `--- Message ${i + 1} | ${fmtSender(m)} | ${m.internalDate} ---\n${body}`;
    })
    .join('\n\n');

  const content = `Thread subject: ${messages[0]?.subject ?? '(none)'}\nMessages: ${messages.length}\n\n${transcript}`;
  const { text, provider } = await generateText([{ role: 'user', content }], {
    operation: 'summarize.thread',
    system: THREAD_SUMMARY_SYSTEM,
    temperature: 0.2,
    maxOutputTokens: 300,
  });
  const summary = text.trim();
  await setThreadSummary(threadId, summary, provider);
  log.debug({ userId, threadId, messages: messages.length }, 'summarized thread');
  return summary;
}

/** Summarise the most recent message in a thread and persist it. */
export async function summarizeLatestMessage(userId: string, threadId: string): Promise<void> {
  const messages = await getMessagesForThread(userId, threadId);
  const latest = messages[messages.length - 1];
  if (!latest || latest.summary) return;
  const summary = await summarizeMessage(latest);
  await setMessageSummary(latest.id, summary);
}
