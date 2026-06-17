import { supabase } from '../db/supabase.js';
import { internal } from '../lib/errors.js';

/**
 * pgvector persistence + retrieval. Vectors are sent to PostgREST as their
 * canonical text literal "[0.1,0.2,...]" which Postgres casts to `vector`.
 */
function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`;
}

export interface EmbeddingInput {
  messageId: string;
  threadId: string;
  chunkIndex: number;
  content: string;
  embedding: number[];
  model: string;
}

/** Replace all embedding chunks for a message (idempotent re-embedding). */
export async function replaceMessageEmbeddings(userId: string, messageId: string, chunks: EmbeddingInput[]): Promise<void> {
  const del = await supabase.from('message_embeddings').delete().eq('user_id', userId).eq('message_id', messageId);
  if (del.error) throw internal('Failed to clear old embeddings', del.error);
  if (chunks.length === 0) return;

  const rows = chunks.map((c) => ({
    user_id: userId,
    message_id: c.messageId,
    thread_id: c.threadId,
    chunk_index: c.chunkIndex,
    content: c.content,
    embedding: toVectorLiteral(c.embedding),
    model: c.model,
  }));
  const { error } = await supabase.from('message_embeddings').insert(rows);
  if (error) throw internal('Failed to insert embeddings', error);
}

export interface MatchRow {
  message_id: string;
  thread_id: string;
  chunk_index: number;
  content: string;
  similarity: number;
  subject: string | null;
  from_address: { name: string | null; email: string } | null;
  internal_date: string;
  gmail_thread_id: string;
}

/** Vector similarity search via the SQL RPC (see migration 0002). */
export async function matchEmbeddings(
  userId: string,
  queryVector: number[],
  matchCount: number,
  minScore: number,
): Promise<MatchRow[]> {
  const { data, error } = await supabase.rpc('match_message_embeddings', {
    p_user_id: userId,
    p_query: toVectorLiteral(queryVector),
    p_match_count: matchCount,
    p_min_score: minScore,
  });
  if (error) throw internal('Vector search failed', error);
  return (data ?? []) as MatchRow[];
}

/** Message ids that have no embeddings yet — drives the embedding backfill. */
export async function getMessageIdsWithoutEmbeddings(userId: string, limit: number): Promise<string[]> {
  // Left-anti-join expressed via a NOT IN against the embeddings table. For
  // very large inboxes this should be a dedicated SQL view/RPC; documented as
  // a scaling note in Architecture.md.
  const embedded = await supabase.from('message_embeddings').select('message_id').eq('user_id', userId);
  if (embedded.error) throw internal('Failed to read embedded message ids', embedded.error);
  const embeddedIds = new Set((embedded.data ?? []).map((r) => r.message_id as string));

  const { data, error } = await supabase
    .from('messages')
    .select('id')
    .eq('user_id', userId)
    .not('body_text', 'is', null)
    .order('internal_date', { ascending: false })
    .limit(limit + embeddedIds.size);
  if (error) throw internal('Failed to read message ids', error);

  return (data ?? [])
    .map((r) => r.id as string)
    .filter((id) => !embeddedIds.has(id))
    .slice(0, limit);
}
