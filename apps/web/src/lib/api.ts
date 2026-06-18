import type {
  ChatMessage,
  ChatSession,
  DraftResponse,
  EmailCategory,
  EmailThread,
  NewsItem,
  Paginated,
  UserProfile,
} from '@repeatless/shared';

/**
 * Thin typed fetch wrapper. In dev, requests go to /api/v1 and Vite proxies to
 * the backend (first-party cookies). In prod, set VITE_API_BASE_URL.
 */
const BASE = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1`;

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public requestId?: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const err = data?.error;
    throw new ApiClientError(res.status, err?.code ?? 'ERROR', err?.message ?? res.statusText, err?.requestId);
  }
  return data as T;
}

export const api = {
  loginUrl: `${BASE}/auth/google`,
  me: () => request<UserProfile>('/auth/me'),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  authConfig: () => request<{ demoEnabled: boolean }>('/auth/config'),
  demoLogin: () => request<{ ok: boolean }>('/auth/demo', { method: 'POST' }),

  syncStatus: () =>
    request<{
      status: string;
      lastSyncedAt: string | null;
      lastError: string | null;
      totalMessages: number;
      threadCount: number;
      email: string;
    }>('/sync/status'),
  triggerSync: (mode: 'full' | 'incremental' = 'incremental') =>
    request<{ accepted: boolean }>('/sync', { method: 'POST', body: JSON.stringify({ mode }) }),

  listThreads: (params: { cursor?: string; category?: EmailCategory; unreadOnly?: boolean; search?: string }) => {
    const q = new URLSearchParams();
    if (params.cursor) q.set('cursor', params.cursor);
    if (params.category) q.set('category', params.category);
    if (params.unreadOnly) q.set('unreadOnly', 'true');
    if (params.search) q.set('search', params.search);
    return request<Paginated<EmailThread>>(`/threads?${q.toString()}`);
  },
  getThread: (id: string) => request<EmailThread>(`/threads/${id}`),
  summarizeThread: (id: string) => request<{ summary: string }>(`/threads/${id}/summarize`, { method: 'POST' }),

  compose: (prompt: string, tone: string) =>
    request<DraftResponse>('/compose', { method: 'POST', body: JSON.stringify({ prompt, tone }) }),
  reply: (threadId: string, prompt: string, tone: string) =>
    request<DraftResponse>('/reply', { method: 'POST', body: JSON.stringify({ threadId, prompt, tone }) }),
  send: (draft: DraftResponse) =>
    request<{ gmailMessageId: string }>('/send', { method: 'POST', body: JSON.stringify(draft) }),

  chat: (message: string, sessionId?: string) =>
    request<{ sessionId: string; message: ChatMessage }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, sessionId }),
    }),
  chatSessions: () => request<{ sessions: ChatSession[] }>('/chat/sessions'),

  newsDigest: (days: number) => request<{ days: number; items: NewsItem[] }>(`/news/digest?days=${days}`),
};
