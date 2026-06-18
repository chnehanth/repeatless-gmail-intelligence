# Repeatless — AI-powered Gmail Intelligence Platform

A web application that connects to your Gmail, syncs and understands your inbox
with AI, and gives you an assistant that can summarize, categorize, draft
thread-aware replies, and answer questions across all your emails — always with
sources, never made up.

> Built for the Repeatless technical assessment. See
> [`Architecture.md`](Architecture.md) for the full design rationale and
> [`REVIEW.md`](REVIEW.md) for the review/hardening log.

---

## Features

- 🔐 **Gmail integration** — OAuth 2.0, full + incremental sync, rate-limit &
  quota aware (token-bucket throttle + exponential backoff with `Retry-After`).
- 📝 **Summarization** — per-message and **context-aware per-thread** summaries.
- ✍️ **Compose & Reply** — natural-language prompt → drafted email; replies
  preserve `In-Reply-To` / `References` so they thread correctly in Gmail.
- 🏷️ **Categorization** — every thread classified (Newsletters, Job/Recruitment,
  Finance, Notifications, Personal, Work/Professional, +Promotions/Other).
- 💬 **AI chat agent** — RAG over your emails with **inline source attribution**
  and **hallucination guards** (says so when it doesn't know).
- 📰 **Newsletter dedup (bonus)** — semantic clustering of news across sources.
- 📊 **Production-ready ops** — structured logs, Prometheus metrics, OpenTelemetry
  tracing, health/readiness probes, and SLO/error-budget tracking.

## Tech stack

React + Vite (frontend) · Node + Express + TypeScript (backend) · Supabase
(Postgres + pgvector) · Google Gemini (primary AI) · NVIDIA NIM (secondary/
fallback AI). Monorepo via pnpm workspaces.

---

## Prerequisites

- **Node ≥ 20** and **pnpm ≥ 9** (`npm i -g pnpm`)
- A **Supabase** project (free tier is fine). The app's data layer talks to
  Supabase's REST API (PostgREST), so a Supabase instance is **required** — see
  the Database section for the local alternative.
- **Google Cloud** OAuth credentials with the Gmail API enabled
- **Google Gemini** API key
- **NVIDIA NIM** API key (free tier — secondary/fallback model)

---

## Setup

### 1. Install

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`. Generate the two secrets:

```bash
# 32-byte AES key for encrypting OAuth tokens (64 hex chars)
openssl rand -hex 32      # -> TOKEN_ENCRYPTION_KEY

# session signing secret (any long random string)
openssl rand -base64 48   # -> SESSION_SECRET
```

> The backend validates all env vars on boot and **refuses to start** with a
> clear error if anything required is missing or malformed.

### 3. Google OAuth (Gmail API)

1. In the [Google Cloud Console](https://console.cloud.google.com/): create a
   project and **enable the Gmail API**.
2. Configure the **OAuth consent screen** (User type: External). While the app
   is unpublished it stays in *Testing* mode, so add your own Google address
   under **Audience → Test users** — only listed users can sign in.
3. Create **OAuth client credentials** (type: Web application).
4. Add the authorized redirect URI exactly:
   `http://localhost:4000/api/v1/auth/google/callback`
5. Put the client id/secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

> At sign-in Google shows a "Google hasn't verified this app" notice (normal for
> apps in Testing) — choose **Advanced → Continue** to proceed.

### 4. Database (Supabase)

The application's repositories use the Supabase client (PostgREST), so it needs
a **Supabase** instance — not just a bare Postgres. Two options:

**Recommended — Supabase cloud (free tier):**

1. Create a project at [supabase.com](https://supabase.com).
2. Set in `.env`:
   - `SUPABASE_URL` — Project Settings → Data API → Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API → **`service_role`** key
   - `DATABASE_URL` — Project Settings → Database → Connection string (URI)

> ⚠️ **URL-encode your DB password** in `DATABASE_URL`. If your Supabase password
> contains characters like `@ ! # $ /`, percent-encode them (e.g. `@`→`%40`,
> `#`→`%23`), or the migration runner fails with `Invalid URL`.

**Local alternative — full Supabase stack via the Supabase CLI:**
`supabase start` runs Postgres + PostgREST locally and prints the URL + keys to
put in `.env`. (The bundled `docker-compose.yml` starts **only** Postgres+pgvector
— enough for `pnpm db:migrate`, but the app's reads/writes need PostgREST, so use
the CLI or the cloud for actually running the app.)

Then run migrations (creates tables, the pgvector index, and the search RPC):

```bash
pnpm db:migrate
```

> **Embedding dimension:** the schema uses `vector(768)`, matching the default
> Gemini `gemini-embedding-001` (requested at 768 dimensions). If you switch
> `EMBEDDING_PROVIDER=nim` (1024-dim), change the `vector(768)` columns in
> [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) and
> [`0002_match_function.sql`](supabase/migrations/0002_match_function.sql) to
> `vector(1024)` and set `EMBEDDING_DIMENSIONS=1024` **before** migrating.

### 5. Run

```bash
pnpm dev          # starts API (:4000) and web (:5173) together
```

Open **http://localhost:5173**, click **Continue with Google**, grant access,
and the initial inbox sync starts automatically. AI enrichment (summaries,
categories, embeddings) runs in the background; summaries appear as they
complete. Watch progress via the sidebar sync indicator.

Run them separately if you prefer:

```bash
pnpm dev:api
pnpm dev:web
```

---

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Run API + web in watch mode |
| `pnpm build` | Build shared, API, and web for production |
| `pnpm typecheck` | Type-check all packages |
| `pnpm lint` | Lint the backend |
| `pnpm test` | Run unit tests |
| `pnpm db:migrate` | Apply database migrations |

---

## API surface (selected)

Base path: `/api/v1`. All non-auth routes require the session cookie.

| Method | Path | Description |
|---|---|---|
| `GET` | `/auth/google` | Start OAuth |
| `GET` | `/auth/me` | Current user + sync status |
| `POST` | `/sync` | Trigger sync (`full` / `incremental`) |
| `GET` | `/sync/status` | Sync state + counts |
| `GET` | `/threads` | Paginated, filterable thread list |
| `GET` | `/threads/:id` | Thread + messages |
| `POST` | `/compose` · `/reply` · `/send` | Draft / send email |
| `POST` | `/chat` | Ask the email agent |
| `GET` | `/news/digest?days=4` | Deduplicated newsletter digest |
| `GET` | `/health` · `/health/ready` · `/health/slo` · `/metrics` | Ops |

---

## Deployment

- **Backend**: build with `pnpm build`, run `node apps/api/dist/index.js`
  (containerizable; reads config from env). Point Prometheus at `/api/v1/metrics`
  and set `OTEL_EXPORTER_OTLP_ENDPOINT` to ship traces. Use k8s
  `livenessProbe: /api/v1/health`, `readinessProbe: /api/v1/health/ready`.
- **Frontend**: `pnpm --filter @repeatless/web build` → static `dist/`; set
  `VITE_API_BASE_URL` to the deployed API origin.
- **Cookies cross-origin**: deploy web + API under the **same domain** (API at
  `/api`) so the session cookie is first-party. Otherwise serve over HTTPS and
  adjust the cookie `SameSite`/`Secure` settings.

---

## Security notes

- OAuth refresh tokens are **encrypted at rest** (AES-256-GCM).
- Sessions are **signed httpOnly cookies**; OAuth uses CSRF `state`.
- **No secrets are committed** — `.env` is git-ignored; the logger redacts them.
- All AI output in the UI is **attributed to its source email(s)**.

## License

MIT — see [`LICENSE`](LICENSE).
