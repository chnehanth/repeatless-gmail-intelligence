# Architecture & Design Document

**Repeatless — AI-powered Gmail Intelligence Platform**

This document explains *what* was built, *how* it is structured, and — most
importantly — *why* each significant decision was made. It is written to be read
top-to-bottom by a reviewer who has not seen the code.

---

## 1. Overview

The platform connects to a user's Gmail account, syncs their mail into a
well-structured database, enriches it with AI (summaries, categories, vector
embeddings), and exposes an assistant experience over it:

- **Gmail integration** — OAuth 2.0, full + incremental sync, rate-limit aware.
- **Summarization** — per-message and context-aware per-thread.
- **Compose & Reply** — natural-language → drafted email; replies preserve
  thread headers so they thread correctly in Gmail.
- **Categorization** — every thread classified into a taxonomy, stored + shown.
- **Chat agent (centerpiece)** — RAG over the user's emails with strict source
  attribution and hallucination guards.
- **Newsletter deduplication (bonus)** — semantic clustering of news items
  across sources.

On top of the functional spec, the system is built for production operability:
structured logging, Prometheus metrics, OpenTelemetry tracing, health/readiness
probes, and an in-process SLO/error-budget tracker.

---

## 2. High-level architecture

```
                         ┌──────────────────────────────┐
                         │   React SPA (apps/web)         │
                         │ Vite · React Query · Design Sys│
                         └───────────────┬───────────────┘
                                         │ HTTPS (cookie session)
                                         ▼
┌───────────────────────────────────────────────────────────────────────┐
│                      API service (apps/api · Express)                    │
│                                                                          │
│  Routes ─▶ Middleware (ctx, auth, rate-limit, errors)                    │
│             │                                                            │
│             ▼                                                            │
│   Services (summarize, categorize, chat/RAG, compose, newsletter, sync)  │
│             │                  │                    │                    │
│             ▼                  ▼                    ▼                    │
│      Repositories         AI orchestrator      Gmail client              │
│      (Supabase)           (Gemini ▶ NIM)       (OAuth2 + throttle)        │
│             │                  │                    │                    │
│  Observability: pino logs · prom metrics · OTel traces · SLO tracker     │
│  Background worker: periodic incremental sync + AI enrichment            │
└──────┬───────────────────────┬───────────────────────────┬─────────────┘
       ▼                       ▼                           ▼
 Supabase Postgres       Google Gemini API           Gmail API
 + pgvector              NVIDIA NIM API               (Google)
```

A **layered, modular monolith**: `routes → services → repositories`, with
cross-cutting concerns (config, observability, errors, AI, Gmail) factored into
their own modules. Each layer depends only on the one below it.

---

## 3. Technology choices & justification

| Layer | Choice | Why |
|---|---|---|
| **Backend** | Node 20 + TypeScript + Express | The spec emphasises Gmail rate-limit handling, sync strategy, and SRE telemetry. A long-lived service (vs. serverless functions) is the natural home for a **background sync worker**, a **client-side token-bucket throttle**, in-process **SLO tracking**, and a **Prometheus scrape endpoint** — all awkward in a serverless model. Express keeps the surface small and explicit. |
| **Language** | TypeScript (strict, `noUncheckedIndexedAccess`) | End-to-end type safety; shared DTOs between client and server via a workspace package. |
| **Frontend** | React + Vite + React Query + the Repeatless Design System | Fast DX, first-class server-state caching/polling (sync status, infinite thread lists). UI is built from the vendored design-system components (tokens + Geist; `apps/web/src/ds`) for brand consistency. |
| **Database** | Supabase (Postgres + pgvector) | Required. One store for relational data *and* vector search avoids a second datastore and keeps retrieval transactional with the source rows. |
| **Primary AI** | Google Gemini (`gemini-2.5-flash` chat, `gemini-embedding-001` embeddings @ 768d) | Required. Flash is fast and cheap for high-volume summarize/categorize/chat; thinking is disabled for these bounded structured calls. |
| **Secondary AI** | NVIDIA NIM (OpenAI-compatible) | Required. Used as an automatic **fallback** for generation, so a Gemini outage/quota exhaustion degrades gracefully instead of failing the product. NIM is also a selectable embedding provider. |
| **Monorepo** | pnpm workspaces | Share types (`@repeatless/shared`) across api + web with a single install. |

---

## 4. Data model

Schema lives in [`supabase/migrations`](supabase/migrations). Key tables:

- **`users`** — identity (email, name, avatar).
- **`oauth_credentials`** — refresh/access tokens **encrypted at rest**
  (AES-256-GCM); one row per user.
- **`sync_state`** — per-user sync status + Gmail `history_id` watermark + last
  error + counts. Powers incremental sync and the status UI.
- **`threads`** — first-class conversation entity with denormalised metadata
  (subject, participants, message_count, last_message_at, **category**,
  **summary**). Most list/filter queries hit only this table.
- **`messages`** — individual messages, including the RFC headers
  (`rfc_message_id`, `in_reply_to`, `references_header`) required for threaded
  replies.
- **`message_embeddings`** — one row per embedded **chunk** (`vector(768)`),
  separated from `messages` so re-embedding never rewrites the source row and
  the vector index stays isolated. HNSW cosine index for ANN search.
- **`chat_sessions` / `chat_messages`** — conversation history; assistant
  messages store their `citations` as JSONB.

**Design decisions**

- *Threads are first-class.* Every AI feature operates on threads. Sync fetches
  **complete threads** (`threads.get`), not loose messages, so the model always
  has full conversation context (critical for thread-aware summaries/replies).
- *Surrogate UUID keys* internally; Gmail's opaque ids are stored alongside with
  unique constraints `(user_id, gmail_*_id)` for idempotent upserts.
- *Hybrid retrieval ready.* A GIN full-text index on message bodies complements
  the vector index; vector search is primary, FTS is the documented fallback.
- *Embedding dimension is a contract.* The `vector(768)` column, the
  `EMBEDDING_DIMENSIONS` env var, and the chosen model must agree — documented in
  `.env.example` and the migration header.

---

## 5. Gmail integration & sync strategy

OAuth 2.0 (scope `gmail.modify` + profile) via `googleapis`. Refresh tokens are
encrypted before storage; the OAuth2 client auto-refreshes access tokens and we
persist the refreshed values via its `tokens` event.

**Sync engine** (`gmail/sync.ts`):

- **Full sync** (first connect, or fallback): capture the current `historyId`
  *before* backfilling (so messages arriving mid-backfill are caught next run),
  list message ids page-by-page up to a configurable cap, derive unique thread
  ids, and fetch + persist each **complete thread** with bounded concurrency.
- **Incremental sync**: `history.list` from the stored `historyId` watermark;
  collect changed/added/deleted threads; re-fetch changed threads; apply
  deletions. If Gmail rejects the `historyId` as too old (404), **fall back to a
  full sync** automatically.
- **At-least-once watermark**: if any changed-thread fetch fails transiently, the
  watermark is **not advanced**, so the same history range is reprocessed next
  run rather than silently dropping changes (fixed during review — see §11).

**Rate-limit & quota handling** (the spec calls this out explicitly):

1. **Proactive** — a process-wide **token bucket** (`gmail/quota.ts`) paces all
   outbound calls under `GMAIL_MAX_RPS`, so we rarely hit the limit.
2. **Reactive** — every Gmail call is wrapped in **exponential backoff with full
   jitter** (`lib/retry.ts`) that retries `429`, soft-`403`
   (`rateLimitExceeded`/`userRateLimitExceeded`), and `5xx`, and **honours the
   server's `Retry-After`** header when present.
3. **Observable** — `gmail_rate_limit_hits_total` and per-method call counters
   feed Prometheus.

**Background worker** (`workers/scheduler.ts`) runs incremental sync for all
connected users on an interval, then triggers AI enrichment. Per-user and
per-tick locks prevent overlap.

---

## 6. AI layer

**Provider abstraction** (`ai/`): a common `ChatProvider` / `EmbeddingProvider`
interface with Gemini and NIM implementations. The orchestrator (`ai/index.ts`):

- **Generation** → Gemini first, **automatic fallback to NIM** on failure;
  records `ai_provider_fallbacks_total` and the `ai_success` SLO.
- **Embeddings** → a single configured provider (vectors from different models
  aren't comparable, so we never silently mix them).
- Every call is instrumented (latency histogram, token counters, success/error).

**Prompts** are centralised in `ai/prompts.ts` for easy review/versioning, and
LLM JSON output is parsed defensively (`ai/json.ts`: strips code fences,
extracts the first balanced object, validates with Zod).

### 6.1 Summarization
- *Per-message*: one dense sentence.
- *Per-thread*: the **whole conversation in chronological order** is sent, with a
  per-message length budget so long threads still fit context. The prompt
  explicitly instructs the model to understand later messages relative to
  earlier ones — satisfying "context-aware, not in isolation".

### 6.2 Categorization
Taxonomy = the six required categories **plus `Promotions` and `Other`**. *Why:*
real inboxes contain marketing mail that is neither a subscription "Newsletter"
nor a transactional "Notification", and a catch-all prevents the classifier from
being forced into a wrong bucket (which would pollute filters and the agent's
precision). Gmail's own `CATEGORY_*` labels are used as a cheap, high-precision
**prior** and as a deterministic fallback if the LLM is unavailable — so
categorization degrades gracefully instead of failing sync.

### 6.3 Chat agent (RAG) — the centerpiece
Pipeline (`services/chat.service.ts` + `retrieval.service.ts`):

1. **Query construction** — the new question is combined with recent user turns
   so pronoun-y follow-ups ("what about their pricing?") still retrieve well
   (conversational context).
2. **Retrieval** — embed the query, ANN search over `message_embeddings`
   (over-fetch then **dedupe to one chunk per message** for source diversity),
   number results `[S1]…[Sn]` with sender/date/subject metadata.
3. **Generation** — a strict system prompt enforces: answer **only** from the
   numbered sources; **cite inline** with `[S#]`; **synthesize across** sources
   for cross-email questions; and say "I couldn't find that in your emails" when
   the context lacks the answer (**no hallucination**).
4. **Attribution** — the `[S#]` markers the model actually used are parsed back
   into structured `citations` and surfaced in the UI as clickable source cards.
   If the model answered but forgot to cite, we attach the top sources so
   provenance is never lost.
5. **Observability** — `chat_responses_total{grounded}` and
   `rag_retrieved_chunks` track grounding quality.

This directly addresses every example in the brief (e.g. "Which companies
rejected my application?", "what do I know about Kubernetes?") via cross-email
synthesis with per-claim attribution.

### 6.4 Newsletter deduplication (bonus)
`services/newsletter.service.ts`: extract discrete stories from each newsletter
(LLM) → embed each story → **greedy semantic clustering** by cosine similarity
(not title matching) → emit one entry per cluster with **all** contributing
sources attributed. Threshold is configurable.

---

## 7. Observability & SRE

| Concern | Implementation |
|---|---|
| **Structured logging** | `pino`, JSON in prod / pretty in dev. A request-scoped `AsyncLocalStorage` context auto-injects `requestId`/`userId`/`operation` into every log line. Secrets are redacted at the logger as defence-in-depth. |
| **Metrics** | `prom-client` at `/api/v1/metrics`. Default process metrics + the four golden signals (latency/traffic/errors/saturation) for HTTP, plus domain metrics: Gmail calls & rate-limit hits, sync duration & volume, AI latency/tokens/fallbacks, RAG chunk counts, chat grounding. |
| **Tracing** | OpenTelemetry auto-instrumentation (HTTP, Express, pg, outbound HTTP to Gmail/Gemini/NIM). Exports via OTLP when an endpoint is configured; zero overhead otherwise. Initialised before any instrumented import. |
| **Health** | `/health` (liveness), `/health/ready` (checks critical deps — DB — and reports non-critical ones), `/health/slo` (SLO compliance + error budgets). |
| **SRE telemetry** | `observability/sre.ts` tracks SLIs against SLOs (API availability, API latency, AI success, sync success) and computes a rolling **error budget**. Mirrors what a Prometheus recording rule would compute, for an at-a-glance reliability view. |
| **Resilience** | Typed errors with a single envelope; global retry/backoff; provider fallback; graceful shutdown (drain + flush traces); `unhandledRejection`/`uncaughtException` handlers. |

---

## 8. Security

- **OAuth tokens encrypted at rest** (AES-256-GCM, per-record IV, auth tag).
- **Signed, httpOnly session cookies** (HMAC-SHA256, timing-safe verify, expiry).
- **OAuth CSRF**: random `state` stored in an httpOnly cookie and verified on
  callback.
- **No secrets in the repo** — everything via env; `.env` is git-ignored;
  `.env.example` documents every variable; the logger redacts secret paths.
- **Input validation** everywhere with Zod (`@repeatless/shared` schemas).
- **Per-user data isolation** enforced in the repository layer (every query
  filters by `user_id`); optional RLS policies provided for direct DB exposure.
- **Hardening**: `helmet`, configurable CORS allow-list with credentials,
  per-user rate limiting on expensive AI endpoints, 1 MB body cap.
- **Prohibited actions are not automated**: the app drafts emails but the user
  reviews and explicitly sends; no destructive or credential-entering flows.

---

## 9. Scalability awareness & trade-offs

The current design runs as a **single instance** and is honest about it. Where a
shortcut is taken, it is documented in code and here, with the production path:

| Area | Current | Production path |
|---|---|---|
| Rate limiter / Gmail throttle | In-memory per instance | Redis token bucket / distributed limiter |
| Background sync | In-process `setInterval` | Durable job queue (pg-boss / BullMQ) with a distributed per-user lock |
| Embedding backfill anti-join | App-side `NOT IN` (`getMessageIdsWithoutEmbeddings`) | Dedicated SQL view / `LEFT JOIN … IS NULL` RPC, or a `needs_embedding` flag column |
| SLO tracker | In-memory window | Prometheus + recording rules as source of truth (this stays as the local mirror) |
| Session store | Stateless signed cookie | Same, or Redis-backed sessions if revocation is needed |
| AI cost | Per-call caps + flash model | Caching of summaries/categories (already persisted), batching, budget metrics already emitted |

**Deliberate trade-offs**: a modular monolith over microservices (simpler,
appropriate for the scope, easy to split later along the existing module
seams); vector + relational in one store (transactional, one fewer system);
flash-tier model by default (latency/cost) with fallback for resilience.

---

## 10. Project structure

```
repeatless/
├── apps/
│   ├── api/        Express backend (routes, services, repos, gmail, ai, observability, workers)
│   └── web/        React SPA (pages, components, typed API client)
├── packages/
│   └── shared/     Shared TS types + Zod API contracts + category taxonomy
├── supabase/
│   └── migrations/ SQL schema, vector match RPC, optional RLS
├── docker-compose.yml   Local Postgres+pgvector
└── Architecture.md / README.md
```

---

## 11. Code review & hardening

The baseline was taken through multiple review passes (correctness, types,
security, error handling, resource safety) plus an independent automated review.
The log is in [`REVIEW.md`](REVIEW.md). Notable fixes: the incremental-sync
**watermark no longer advances past transiently-failed thread fetches**
(prevented silent data loss); HTML bodies are size-capped; reply threading
headers are derived from the same message chosen as the reply target. The
backend type-checks, lints clean, boots, and passes 34 unit tests covering MIME
threading, crypto round-trips, Gmail parsing, retry/backoff, chunking, vector
math, and RAG citation extraction.

---

## 12. What I would do next (with more time)

- Streaming chat responses (SSE) for snappier UX.
- Hybrid retrieval (reciprocal-rank fusion of vector + FTS) and a re-ranker.
- Gmail push notifications (Pub/Sub `watch`) instead of polling.
- A real job queue + worker separation for sync/enrichment at scale.
- End-to-end tests against the Gmail API sandbox and a seeded Supabase.
