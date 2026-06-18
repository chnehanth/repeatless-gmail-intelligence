/** Gmail OAuth scopes. `modify` lets us read, label, and send/draft. */
export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'openid',
];

export const API_PREFIX = '/api/v1';

/** Session cookie name for the signed user-id token. */
export const SESSION_COOKIE = 'rpl_session';

/** OAuth CSRF state cookie. */
export const OAUTH_STATE_COOKIE = 'rpl_oauth_state';

/** Max characters of email body fed to the LLM per message (cost guard). */
export const MAX_BODY_CHARS_FOR_LLM = 12_000;

/** Embedding chunking. */
export const EMBED_CHUNK_CHARS = 1_500;
export const EMBED_CHUNK_OVERLAP = 200;

/** RAG retrieval defaults. We use pure top-K nearest-neighbour ranking with no
 * absolute-similarity floor (-1 ⇒ never filter): gemini-embedding-001 truncated
 * to 768 dims yields a compressed/low cosine range where even relevant chunks
 * can score near zero, so any positive floor silently drops good matches. The
 * `<=>` distance ordering still surfaces the closest chunks first, and the
 * grounding/anti-hallucination prompt discards anything irrelevant. */
export const RAG_TOP_K = 8;
export const RAG_MIN_SIMILARITY = -1;

/** Newsletter dedup similarity threshold (cosine). */
export const NEWS_DEDUP_THRESHOLD = 0.82;
