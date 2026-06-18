/**
 * Seed the "Explore the demo" showcase account into Supabase.
 *
 *   pnpm --filter @repeatless/api run seed:demo
 *
 * Idempotent: wipes the demo user's threads (cascades messages + embeddings)
 * and re-inserts them, then generates real embeddings via the configured
 * provider so the chat agent works over the demo inbox. Safe to re-run.
 */
import { env } from '../config/env.js';
import { supabase } from './supabase.js';
import { upsertUser, updateSyncState } from '../repos/users.repo.js';
import { upsertThread } from '../repos/threads.repo.js';
import { upsertMessage } from '../repos/messages.repo.js';
import { setThreadCategory, setThreadSummary } from '../repos/threads.repo.js';
import { embedMessage } from '../services/embedding.service.js';
import { DEMO_THREADS, DEMO_ME } from './demo-data.js';
import type { ParsedMessage } from '../gmail/parse.js';

function out(msg: string): void {
  process.stdout.write(`${msg}\n`);
}

async function main(): Promise<void> {
  out(`Seeding demo account: ${env.DEMO_USER_EMAIL}`);

  const user = await upsertUser({ email: env.DEMO_USER_EMAIL, displayName: DEMO_ME.name, avatarUrl: null });
  const userId = user.id;

  // Flag as demo (guards sync/send) and wipe prior demo data (FK cascades).
  await supabase.from('users').update({ is_demo: true }).eq('id', userId);
  await supabase.from('threads').delete().eq('user_id', userId);

  let totalMessages = 0;
  let embedded = 0;

  for (const t of DEMO_THREADS) {
    const parsed: ParsedMessage[] = t.messages.map((m, i) => {
      const gmailMessageId = `${t.gmailThreadId}-m${i}`;
      const prior = i > 0 ? `<${t.gmailThreadId}-m${i - 1}@repeatless.demo>` : null;
      return {
        gmailMessageId,
        gmailThreadId: t.gmailThreadId,
        rfcMessageId: `<${gmailMessageId}@repeatless.demo>`,
        inReplyTo: prior,
        references: prior ? [prior] : [],
        from: m.from,
        to: [DEMO_ME],
        cc: [],
        subject: t.subject,
        snippet: m.body.slice(0, 140).replace(/\n/g, ' '),
        bodyText: m.body,
        bodyHtml: null,
        labelIds: t.unread ? ['INBOX', 'UNREAD'] : ['INBOX'],
        isUnread: Boolean(t.unread),
        internalDate: m.date,
      };
    });

    const participants = dedupe([...parsed.flatMap((m) => (m.from ? [m.from] : [])), DEMO_ME]);
    const lastMessageAt = parsed.reduce((mx, m) => (m.internalDate > mx ? m.internalDate : mx), parsed[0]!.internalDate);

    const threadId = await upsertThread(userId, {
      gmailThreadId: t.gmailThreadId,
      subject: t.subject,
      participants,
      messageCount: parsed.length,
      isUnread: Boolean(t.unread),
      lastMessageAt,
    });

    for (const m of parsed) {
      const messageId = await upsertMessage(userId, threadId, m);
      totalMessages += 1;
      try {
        embedded += await embedMessage(userId, messageId);
      } catch (err) {
        out(`  ! embed failed for ${m.gmailMessageId}: ${(err as Error).message}`);
      }
    }

    await setThreadSummary(threadId, t.summary, 'seed');
    await setThreadCategory(threadId, t.category, 0.95);
    out(`  ✓ ${t.category.padEnd(18)} ${t.subject}`);
  }

  await updateSyncState(userId, {
    status: 'idle',
    historyId: null,
    lastSyncedAt: new Date().toISOString(),
    lastError: null,
    totalMessages,
  });

  out(`\n✓ Demo seeded: ${DEMO_THREADS.length} threads, ${totalMessages} messages, ${embedded} embedding chunks.`);
}

function dedupe<T extends { email: string }>(arr: T[]): T[] {
  const seen = new Map<string, T>();
  for (const a of arr) if (a.email && !seen.has(a.email)) seen.set(a.email, a);
  return [...seen.values()];
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    process.stderr.write(`\n✗ Demo seed failed: ${(err as Error).message}\n`);
    process.exit(1);
  });
