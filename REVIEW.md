# Review & Hardening Log

The baseline implementation was taken through iterative review cycles — each
pass targeting a specific quality dimension — followed by an independent
automated code review. This log records what each pass checked and what changed.
Every pass ends with the gate: **typecheck + lint + 34 unit tests + a live boot
smoke test all green.**

| # | Pass | Focus | Outcome |
|---|---|---|---|
| 1 | Config integrity | Fail-fast env validation; no silent defaults for secrets | `env.ts` exits with a precise message on bad/missing config |
| 2 | Type strictness | `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals` across the codebase | Fixed `Record` index access (`SLOS.api_latency?`), removed unused import |
| 3 | Zod inference | LLM JSON parsing returning input vs output types | `parseJson` switched to `z.infer<S>` so `.default()` fields are non-optional |
| 4 | Module portability | pnpm strict layout + `declaration` emit | Annotated all routers as `: Router`; added explicit `google-auth-library` dep |
| 5 | Secret hygiene | Tokens, keys, cookies | AES-256-GCM at rest; pino redaction; `.env` git-ignored; no secrets in code |
| 6 | OAuth flow | CSRF, refresh-token persistence | `state` cookie verified; existing refresh token preserved when Google omits one |
| 7 | Gmail rate limits | 429 / soft-403 / 5xx / `Retry-After` | Token bucket + full-jitter backoff; verified retry classification |
| 8 | Sync correctness | Full vs incremental, historyId watermark | Watermark captured before backfill; 404 → full-sync fallback |
| 9 | **Sync durability** | Data loss on transient fetch failure | **Watermark no longer advances past transiently-failed threads** (at-least-once); 404 treated as deletion |
| 10 | Thread-first modeling | Fetch complete threads, not loose messages | Sync uses `threads.get`; aggregates participants/counts/unread |
| 11 | Reply threading | `In-Reply-To` / `References`, recipient selection | Threading headers + recipients now derived from the **same** target message |
| 12 | MIME safety | Non-ASCII subjects, CRLF, base64url | RFC 2047 subject encoding; unit-tested |
| 13 | RAG numbering | Source `[S#]` ↔ citation extraction consistency | Dedupe-per-message, stable 1-based indices, bounds-checked extraction; unit-tested |
| 14 | Anti-hallucination | Grounding + attribution prompt rules | Strict system prompt; "couldn't find it" path; grounding metric |
| 15 | Categorization robustness | LLM failure handling | Gmail `CATEGORY_*` prior + deterministic fallback so sync never fails on AI errors |
| 16 | AI resilience | Provider outage | Gemini→NIM fallback with metrics + SLO recording |
| 17 | Resource safety | Unbounded growth / leaks | Rate-limiter sweep + `unref`; bounded concurrency; HTML body size-capped |
| 18 | Error surface | Consistent envelope, no internal leakage | Typed `AppError` → single `{error:{code,message,requestId}}`; 5xx messages sanitized |
| 19 | Observability completeness | Logs/metrics/traces/health/SLO | Request-scoped correlation; golden-signal + domain metrics; probes verified live |
| 20 | Lifecycle | Startup/shutdown | Tracing init ordering; graceful drain; crash handlers |
| — | Independent automated review | Adversarial bug hunt across sync/RAG/auth/compose/dedup | 1 HIGH + 2 MEDIUM + 1 LOW found and fixed (below) |

## Issues found by the independent review and fixed

- **HIGH — incremental sync advanced the `historyId` watermark even when a
  changed-thread fetch failed transiently**, silently dropping those changes
  permanently. *Fix:* hold the watermark on transient failure (reprocess next
  run); only 404 ("thread deleted") is treated as benign.
  → `gmail/sync.ts`
- **MEDIUM — `bodyHtml` stored uncapped** while `bodyText` was capped; large
  marketing emails could bloat rows. *Fix:* cap HTML at 200k chars.
  → `gmail/parse.ts`
- **MEDIUM — reply `References`/`In-Reply-To` were built from the last message
  while recipients came from the last *inbound* message** (possible mismatch).
  *Fix:* derive both from the single chosen target message.
  → `services/compose.service.ts`
- **LOW — no-op `(?=)` lookahead** in the `<br>`-to-newline regex. *Fix:* removed.
  → `gmail/parse.ts`

Areas the review explicitly confirmed correct: crypto (GCM + timing-safe HMAC),
auth/session parsing, OAuth CSRF, embeddings vector literal + RPC args, retrieval
numbering, newsletter clustering, concurrency pool, token-bucket math, MIME
headers.

## Verification

```
typecheck   ✓ (api + web + shared)
lint        ✓ (eslint, 0 errors/warnings)
test        ✓ 34/34 unit tests
build       ✓ api (tsc) + web (vite, 86 KB gzip)
boot        ✓ /health, /health/slo, /metrics, 401-on-protected, graceful shutdown
```
