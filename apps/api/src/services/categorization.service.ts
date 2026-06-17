import { z } from 'zod';
import { EMAIL_CATEGORIES, isEmailCategory, type EmailCategory } from '@repeatless/shared';
import { generateText } from '../ai/index.js';
import { categorizeSystem } from '../ai/prompts.js';
import { parseJson } from '../ai/json.js';
import { MAX_BODY_CHARS_FOR_LLM } from '../config/constants.js';
import { truncate } from '../lib/text.js';
import { getMessagesForThread } from '../repos/messages.repo.js';
import { setThreadCategory } from '../repos/threads.repo.js';
import { childLogger } from '../observability/logger.js';

const log = childLogger('service:categorization');

const categorySchema = z.object({
  category: z.string(),
  confidence: z.number().min(0).max(1).default(0.5),
  reason: z.string().optional(),
});

/**
 * Map Gmail's own category labels to our taxonomy as a cheap, high-precision
 * prior. The LLM refines the final decision, but this anchors common cases and
 * provides a deterministic fallback if the model is unavailable.
 */
function gmailLabelHint(labelIds: string[]): EmailCategory | null {
  if (labelIds.includes('CATEGORY_PROMOTIONS')) return 'Promotions';
  if (labelIds.includes('CATEGORY_FORUMS')) return 'Newsletters';
  if (labelIds.includes('CATEGORY_UPDATES')) return 'Notifications';
  if (labelIds.includes('CATEGORY_SOCIAL')) return 'Notifications';
  if (labelIds.includes('CATEGORY_PERSONAL')) return 'Personal';
  return null;
}

export async function categorizeThread(
  userId: string,
  threadId: string,
): Promise<{ category: EmailCategory; confidence: number }> {
  const messages = await getMessagesForThread(userId, threadId);
  if (messages.length === 0) return { category: 'Other', confidence: 0 };

  const latest = messages[messages.length - 1]!;
  const hint = gmailLabelHint(latest.labelIds);
  const sender = latest.fromAddress ? `${latest.fromAddress.name ?? ''} <${latest.fromAddress.email}>` : 'Unknown';
  const body = truncate(latest.bodyText ?? latest.snippet ?? '', Math.min(4000, MAX_BODY_CHARS_FOR_LLM));

  const content = [
    `Subject: ${latest.subject ?? '(none)'}`,
    `From: ${sender}`,
    hint ? `Gmail category hint: ${hint}` : null,
    '',
    body,
  ]
    .filter((l) => l !== null)
    .join('\n');

  try {
    const { text } = await generateText([{ role: 'user', content }], {
      operation: 'categorize',
      system: categorizeSystem(),
      temperature: 0,
      json: true,
      maxOutputTokens: 120,
    });
    const parsed = parseJson(text, categorySchema);
    const category: EmailCategory = isEmailCategory(parsed.category) ? parsed.category : hint ?? 'Other';
    const confidence = isEmailCategory(parsed.category) ? parsed.confidence : hint ? 0.6 : 0.3;
    await setThreadCategory(threadId, category, confidence);
    return { category, confidence };
  } catch (err) {
    // Degrade gracefully to the deterministic hint rather than failing sync.
    log.warn({ userId, threadId, err: err instanceof Error ? err.message : err }, 'LLM categorization failed; using hint');
    const fallback = hint ?? 'Other';
    await setThreadCategory(threadId, fallback, hint ? 0.5 : 0.1);
    return { category: fallback, confidence: hint ? 0.5 : 0.1 };
  }
}

export const SUPPORTED_CATEGORIES = EMAIL_CATEGORIES;
