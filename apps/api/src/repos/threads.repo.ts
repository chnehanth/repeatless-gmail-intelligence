import type { EmailAddress, EmailCategory, EmailThread, Paginated } from '@repeatless/shared';
import { supabase } from '../db/supabase.js';
import { internal, notFound } from '../lib/errors.js';

interface ThreadRow {
  id: string;
  gmail_thread_id: string;
  subject: string | null;
  category: string | null;
  category_confidence: number | null;
  summary: string | null;
  participants: EmailAddress[];
  message_count: number;
  is_unread: boolean;
  last_message_at: string;
}

function toDomain(r: ThreadRow): EmailThread {
  return {
    id: r.id,
    gmailThreadId: r.gmail_thread_id,
    subject: r.subject,
    category: (r.category as EmailCategory | null) ?? null,
    categoryConfidence: r.category_confidence,
    summary: r.summary,
    participants: Array.isArray(r.participants) ? r.participants : [],
    messageCount: r.message_count,
    isUnread: r.is_unread,
    lastMessageAt: r.last_message_at,
  };
}

const SELECT =
  'id, gmail_thread_id, subject, category, category_confidence, summary, participants, message_count, is_unread, last_message_at';

/** Upsert a thread's denormalised metadata (called during sync). */
export async function upsertThread(
  userId: string,
  input: {
    gmailThreadId: string;
    subject: string | null;
    participants: EmailAddress[];
    messageCount: number;
    isUnread: boolean;
    lastMessageAt: string;
  },
): Promise<string> {
  const { data, error } = await supabase
    .from('threads')
    .upsert(
      {
        user_id: userId,
        gmail_thread_id: input.gmailThreadId,
        subject: input.subject,
        participants: input.participants,
        message_count: input.messageCount,
        is_unread: input.isUnread,
        last_message_at: input.lastMessageAt,
      },
      { onConflict: 'user_id,gmail_thread_id' },
    )
    .select('id')
    .single();
  if (error || !data) throw internal('Failed to upsert thread', error);
  return data.id as string;
}

export async function getThreadIdByGmailId(userId: string, gmailThreadId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('threads')
    .select('id')
    .eq('user_id', userId)
    .eq('gmail_thread_id', gmailThreadId)
    .maybeSingle();
  if (error) throw internal('Failed to look up thread', error);
  return (data?.id as string | undefined) ?? null;
}

export async function listThreads(
  userId: string,
  opts: { limit: number; cursor?: string; category?: EmailCategory; unreadOnly?: boolean; search?: string },
): Promise<Paginated<EmailThread>> {
  let query = supabase
    .from('threads')
    .select(SELECT)
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false })
    .limit(opts.limit + 1);

  if (opts.category) query = query.eq('category', opts.category);
  if (opts.unreadOnly) query = query.eq('is_unread', true);
  if (opts.search) query = query.ilike('subject', `%${opts.search}%`);
  // Keyset pagination on last_message_at (stable, index-backed).
  if (opts.cursor) query = query.lt('last_message_at', opts.cursor);

  const { data, error } = await query;
  if (error) throw internal('Failed to list threads', error);

  const rows = (data ?? []) as ThreadRow[];
  const hasMore = rows.length > opts.limit;
  const page = hasMore ? rows.slice(0, opts.limit) : rows;
  const nextCursor = hasMore ? (page[page.length - 1]?.last_message_at ?? null) : null;
  return { items: page.map(toDomain), nextCursor };
}

export async function getThread(userId: string, threadId: string): Promise<EmailThread> {
  const { data, error } = await supabase
    .from('threads')
    .select(SELECT)
    .eq('user_id', userId)
    .eq('id', threadId)
    .maybeSingle();
  if (error) throw internal('Failed to load thread', error);
  if (!data) throw notFound('Thread not found');
  return toDomain(data as ThreadRow);
}

export async function setThreadSummary(threadId: string, summary: string, model: string): Promise<void> {
  const { error } = await supabase
    .from('threads')
    .update({ summary, summary_model: model, summary_updated_at: new Date().toISOString() })
    .eq('id', threadId);
  if (error) throw internal('Failed to save thread summary', error);
}

export async function setThreadCategory(
  threadId: string,
  category: EmailCategory,
  confidence: number,
): Promise<void> {
  const { error } = await supabase
    .from('threads')
    .update({ category, category_confidence: confidence })
    .eq('id', threadId);
  if (error) throw internal('Failed to save thread category', error);
}

/** Threads that still need AI enrichment (summary/category). */
export async function getThreadsNeedingEnrichment(userId: string, limit: number): Promise<string[]> {
  const { data, error } = await supabase
    .from('threads')
    .select('id')
    .eq('user_id', userId)
    .or('summary.is.null,category.is.null')
    .order('last_message_at', { ascending: false })
    .limit(limit);
  if (error) throw internal('Failed to list threads needing enrichment', error);
  return (data ?? []).map((r) => r.id as string);
}

export async function countThreads(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('threads')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  if (error) throw internal('Failed to count threads', error);
  return count ?? 0;
}
