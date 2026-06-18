-- =========================================================================
-- Re-apply the filtered-ANN fix as VOLATILE (0005 was created STABLE on
-- already-migrated databases, which rejects SET LOCAL at runtime).
--
-- message_embeddings is shared across users. With an HNSW index, Postgres
-- fetches the top `hnsw.ef_search` nearest neighbours GLOBALLY and only then
-- applies the `user_id = p_user_id` filter — so a user who owns a small slice
-- of the table gets very few (often 1–2) results regardless of p_match_count.
--
-- Rewrite the function in plpgsql and raise hnsw.ef_search for the call so
-- enough candidates survive the per-user filter. At our scale this is
-- effectively exact recall. (For very large multi-tenant tables, also enable
-- pgvector 0.8+ iterative scan or a per-user partial index — see Architecture.)
-- =========================================================================

create or replace function match_message_embeddings(
  p_user_id     uuid,
  p_query       vector(768),
  p_match_count int default 8,
  p_min_score   float default -1
)
returns table (
  message_id      uuid,
  thread_id       uuid,
  chunk_index     int,
  content         text,
  similarity      float,
  subject         text,
  from_address    jsonb,
  internal_date   timestamptz,
  gmail_thread_id text
)
language plpgsql volatile
as $$
begin
  -- Widen the ANN candidate pool so the user filter doesn't starve results.
  -- (VOLATILE is required because the function issues SET LOCAL.)
  set local hnsw.ef_search = 1000;
  return query
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
end;
$$;
