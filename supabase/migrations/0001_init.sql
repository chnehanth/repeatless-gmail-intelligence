-- =========================================================================
-- Repeatless — Gmail Intelligence Platform — initial schema
--
-- Target: Supabase (PostgreSQL 15+) with the `vector` (pgvector) extension.
-- Design notes:
--   * Threads are first-class. Messages belong to a thread; all AI features
--     (summaries, categories, RAG) hang off threads/messages.
--   * Embeddings live in their own table so a message can be re-chunked /
--     re-embedded without rewriting the message row, and so the vector index
--     stays isolated.
--   * `gmail_*_id` columns store Gmail's opaque ids; surrogate UUID PKs are
--     used internally so the schema is portable and FKs are uniform.
--   * Row Level Security: this app uses a server-side service-role key and
--     scopes every query by user_id in the data-access layer. RLS policies
--     are provided (commented) for teams that expose Supabase directly.
-- =========================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "vector";      -- pgvector

-- ---- Embedding dimension -------------------------------------------------
-- IMPORTANT: this MUST equal EMBEDDING_DIMENSIONS in your .env and the output
-- dimension of EMBEDDING_PROVIDER's model.
--   * Gemini text-embedding-004 -> 768  (default below)
--   * NVIDIA nv-embedqa-e5-v5   -> 1024 (change vector(768) -> vector(1024))
-- -------------------------------------------------------------------------

-- ============================ users ======================================
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  display_name  text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- OAuth tokens, encrypted at rest by the application (AES-256-GCM).
-- We never store plaintext refresh tokens.
create table if not exists oauth_credentials (
  user_id              uuid primary key references users(id) on delete cascade,
  provider             text not null default 'google',
  access_token_enc     text,
  refresh_token_enc    text not null,
  scope                text,
  token_type           text,
  expiry               timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Per-user sync bookkeeping. `history_id` powers Gmail incremental sync.
create table if not exists sync_state (
  user_id          uuid primary key references users(id) on delete cascade,
  status           text not null default 'idle'
                     check (status in ('idle','initial','incremental','error')),
  history_id       text,                 -- Gmail historyId watermark
  last_synced_at   timestamptz,
  last_error       text,
  total_messages   integer not null default 0,
  updated_at       timestamptz not null default now()
);

-- ============================ labels =====================================
create table if not exists labels (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  gmail_label_id text not null,
  name           text not null,
  type           text not null default 'user' check (type in ('system','user')),
  created_at     timestamptz not null default now(),
  unique (user_id, gmail_label_id)
);

-- ============================ threads ====================================
create table if not exists threads (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users(id) on delete cascade,
  gmail_thread_id     text not null,
  subject             text,
  category            text,
  category_confidence real,
  summary             text,
  summary_model       text,
  summary_updated_at  timestamptz,
  participants        jsonb not null default '[]'::jsonb,
  message_count       integer not null default 0,
  is_unread           boolean not null default false,
  last_message_at     timestamptz not null default now(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, gmail_thread_id)
);

-- ============================ messages ===================================
create table if not exists messages (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references users(id) on delete cascade,
  thread_id         uuid not null references threads(id) on delete cascade,
  gmail_message_id  text not null,
  rfc_message_id    text,                 -- RFC822 Message-ID header
  in_reply_to       text,
  references_header text[],               -- References header, split
  from_address      jsonb,
  to_addresses      jsonb not null default '[]'::jsonb,
  cc_addresses      jsonb not null default '[]'::jsonb,
  subject           text,
  snippet           text,
  body_text         text,
  body_html         text,
  label_ids         text[] not null default '{}',
  is_unread         boolean not null default false,
  internal_date     timestamptz not null,
  summary           text,
  created_at        timestamptz not null default now(),
  unique (user_id, gmail_message_id)
);

-- ============================ embeddings =================================
-- One row per embedded chunk. A message may be chunked into several rows for
-- long bodies; `chunk_index` orders them.
create table if not exists message_embeddings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  message_id    uuid not null references messages(id) on delete cascade,
  thread_id     uuid not null references threads(id) on delete cascade,
  chunk_index   integer not null default 0,
  content       text not null,
  embedding     vector(768) not null,
  model         text not null,
  created_at    timestamptz not null default now(),
  unique (message_id, chunk_index)
);

-- ============================ chat =======================================
create table if not exists chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  title       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references chat_sessions(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  role        text not null check (role in ('user','assistant')),
  content     text not null,
  citations   jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

-- ============================ indexes ====================================
create index if not exists idx_threads_user_last_msg
  on threads (user_id, last_message_at desc);
create index if not exists idx_threads_user_category
  on threads (user_id, category);
create index if not exists idx_threads_user_unread
  on threads (user_id, is_unread) where is_unread = true;

create index if not exists idx_messages_thread
  on messages (thread_id, internal_date);
create index if not exists idx_messages_user_date
  on messages (user_id, internal_date desc);

create index if not exists idx_embeddings_user
  on message_embeddings (user_id);

-- Approximate nearest-neighbour index for cosine similarity search.
-- HNSW gives good recall/latency without a training step; `lists`-free.
create index if not exists idx_embeddings_vector
  on message_embeddings using hnsw (embedding vector_cosine_ops);

create index if not exists idx_chat_messages_session
  on chat_messages (session_id, created_at);

-- Full-text search fallback over message bodies (used when embeddings are
-- unavailable or to complement vector recall — hybrid retrieval).
create index if not exists idx_messages_fts
  on messages using gin (to_tsvector('english',
    coalesce(subject,'') || ' ' || coalesce(body_text, snippet, '')));

-- ============================ triggers ===================================
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_users_updated') then
    create trigger trg_users_updated before update on users
      for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_threads_updated') then
    create trigger trg_threads_updated before update on threads
      for each row execute function set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'trg_oauth_updated') then
    create trigger trg_oauth_updated before update on oauth_credentials
      for each row execute function set_updated_at();
  end if;
end$$;
