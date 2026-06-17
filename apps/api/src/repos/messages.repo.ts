import type { EmailMessage } from '@repeatless/shared';
import { supabase } from '../db/supabase.js';
import { internal } from '../lib/errors.js';
import type { ParsedMessage } from '../gmail/parse.js';

interface MessageRow {
  id: string;
  gmail_message_id: string;
  thread_id: string;
  rfc_message_id: string | null;
  in_reply_to: string | null;
  references_header: string[] | null;
  from_address: EmailMessage['fromAddress'];
  to_addresses: EmailMessage['toAddresses'];
  cc_addresses: EmailMessage['ccAddresses'];
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  label_ids: string[];
  is_unread: boolean;
  internal_date: string;
  summary: string | null;
}

function toDomain(r: MessageRow): EmailMessage {
  return {
    id: r.id,
    gmailMessageId: r.gmail_message_id,
    threadId: r.thread_id,
    fromAddress: r.from_address ?? null,
    toAddresses: Array.isArray(r.to_addresses) ? r.to_addresses : [],
    ccAddresses: Array.isArray(r.cc_addresses) ? r.cc_addresses : [],
    subject: r.subject,
    snippet: r.snippet,
    bodyText: r.body_text,
    internalDate: r.internal_date,
    labelIds: r.label_ids ?? [],
    rfcMessageId: r.rfc_message_id,
    inReplyTo: r.in_reply_to,
    references: r.references_header ?? [],
    isUnread: r.is_unread,
    summary: r.summary,
  };
}

const SELECT =
  'id, gmail_message_id, thread_id, rfc_message_id, in_reply_to, references_header, from_address, to_addresses, cc_addresses, subject, snippet, body_text, label_ids, is_unread, internal_date, summary';

/** Upsert a parsed message. Returns the internal message id. */
export async function upsertMessage(userId: string, threadId: string, m: ParsedMessage): Promise<string> {
  const { data, error } = await supabase
    .from('messages')
    .upsert(
      {
        user_id: userId,
        thread_id: threadId,
        gmail_message_id: m.gmailMessageId,
        rfc_message_id: m.rfcMessageId,
        in_reply_to: m.inReplyTo,
        references_header: m.references,
        from_address: m.from,
        to_addresses: m.to,
        cc_addresses: m.cc,
        subject: m.subject,
        snippet: m.snippet,
        body_text: m.bodyText,
        body_html: m.bodyHtml,
        label_ids: m.labelIds,
        is_unread: m.isUnread,
        internal_date: m.internalDate,
      },
      { onConflict: 'user_id,gmail_message_id' },
    )
    .select('id')
    .single();
  if (error || !data) throw internal('Failed to upsert message', error);
  return data.id as string;
}

export async function getMessagesForThread(userId: string, threadId: string): Promise<EmailMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(SELECT)
    .eq('user_id', userId)
    .eq('thread_id', threadId)
    .order('internal_date', { ascending: true });
  if (error) throw internal('Failed to load thread messages', error);
  return ((data ?? []) as MessageRow[]).map(toDomain);
}

export async function getMessageById(userId: string, messageId: string): Promise<EmailMessage | null> {
  const { data, error } = await supabase
    .from('messages')
    .select(SELECT)
    .eq('user_id', userId)
    .eq('id', messageId)
    .maybeSingle();
  if (error) throw internal('Failed to load message', error);
  return data ? toDomain(data as MessageRow) : null;
}

export async function setMessageSummary(messageId: string, summary: string): Promise<void> {
  const { error } = await supabase.from('messages').update({ summary }).eq('id', messageId);
  if (error) throw internal('Failed to save message summary', error);
}

export async function deleteMessageByGmailId(userId: string, gmailMessageId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('user_id', userId)
    .eq('gmail_message_id', gmailMessageId);
  if (error) throw internal('Failed to delete message', error);
}

/** Messages within a recent window, filtered by category — used by the news digest. */
export async function getRecentMessagesByCategory(
  userId: string,
  category: string,
  sinceIso: string,
  limit: number,
): Promise<EmailMessage[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(`${SELECT}, threads!inner(category)`)
    .eq('user_id', userId)
    .eq('threads.category', category)
    .gte('internal_date', sinceIso)
    .order('internal_date', { ascending: false })
    .limit(limit);
  if (error) throw internal('Failed to load recent messages', error);
  return ((data ?? []) as MessageRow[]).map(toDomain);
}
