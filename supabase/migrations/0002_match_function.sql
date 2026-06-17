-- =========================================================================
-- Vector similarity search RPC.
-- Exposed to the app via supabase.rpc('match_message_embeddings', ...).
-- Returns the top-K most similar chunks for a user, with the joined message
-- + thread metadata needed to build source citations in a single round trip.
-- =========================================================================

create or replace function match_message_embeddings(
  p_user_id     uuid,
  p_query       vector(768),
  p_match_count int default 8,
  p_min_score   float default 0.0
)
returns table (
  message_id     uuid,
  thread_id      uuid,
  chunk_index    int,
  content        text,
  similarity     float,
  subject        text,
  from_address   jsonb,
  internal_date  timestamptz,
  gmail_thread_id text
)
language sql stable
as $$
  select
    e.message_id,
    e.thread_id,
    e.chunk_index,
    e.content,
    1 - (e.embedding <=> p_query) as similarity,
    m.subject,
    m.from_address,
    m.internal_date,
    t.gmail_thread_id
  from message_embeddings e
  join messages m on m.id = e.message_id
  join threads  t on t.id = e.thread_id
  where e.user_id = p_user_id
    and 1 - (e.embedding <=> p_query) >= p_min_score
  order by e.embedding <=> p_query
  limit greatest(p_match_count, 1);
$$;
