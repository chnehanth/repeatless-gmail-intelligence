import { google, type gmail_v1 } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { gmailApiCalls, gmailRateLimitHits } from '../observability/metrics.js';
import { childLogger } from '../observability/logger.js';
import { withRetry } from '../lib/retry.js';
import { gmailError } from '../lib/errors.js';
import { gmailThrottle } from './quota.js';

const log = childLogger('gmail:client');

interface GoogleApiError {
  code?: number;
  status?: number;
  errors?: Array<{ reason?: string }>;
  response?: { status?: number; headers?: Record<string, string> };
}

function statusOf(err: unknown): number | undefined {
  const e = err as GoogleApiError;
  return e.code ?? e.status ?? e.response?.status;
}

/** A Gmail error is retryable on rate-limit (429) and transient 5xx. */
function isRetryable(err: unknown): boolean {
  const status = statusOf(err);
  if (status === 429) return true;
  if (status === 403) {
    const reasons = (err as GoogleApiError).errors?.map((x) => x.reason) ?? [];
    // 403 with these reasons is a soft rate limit, not a hard auth failure.
    return reasons.some((r) => r === 'rateLimitExceeded' || r === 'userRateLimitExceeded');
  }
  return status !== undefined && status >= 500;
}

function retryAfterOf(err: unknown): number | undefined {
  const header = (err as GoogleApiError).response?.headers?.['retry-after'];
  if (!header) return undefined;
  const secs = Number(header);
  return Number.isFinite(secs) ? secs : undefined;
}

/**
 * Thin wrapper over the Gmail API that applies, for every call:
 *   1. client-side throttling (token bucket) to stay under quota,
 *   2. exponential backoff + Retry-After handling on 429/5xx,
 *   3. metrics (call counts, rate-limit hits) and structured logging.
 */
export class GmailClient {
  private readonly gmail: gmail_v1.Gmail;

  constructor(auth: OAuth2Client) {
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  private async call<T>(method: string, fn: () => Promise<T>): Promise<T> {
    return withRetry(
      async () => {
        await gmailThrottle.take();
        try {
          const result = await fn();
          gmailApiCalls.inc({ method, outcome: 'success' });
          return result;
        } catch (err) {
          const status = statusOf(err);
          if (status === 429 || isRetryable(err)) {
            gmailRateLimitHits.inc();
            gmailApiCalls.inc({ method, outcome: 'rate_limited' });
          } else {
            gmailApiCalls.inc({ method, outcome: 'error' });
          }
          throw err;
        }
      },
      { label: `gmail.${method}`, isRetryable, retryAfterOf, retries: 6, baseDelayMs: 500 },
    ).catch((err) => {
      log.error({ method, status: statusOf(err), err: err instanceof Error ? err.message : err }, 'gmail call failed');
      throw gmailError(`Gmail API call ${method} failed`, err);
    });
  }

  async getProfile(): Promise<gmail_v1.Schema$Profile> {
    return this.call('getProfile', async () => (await this.gmail.users.getProfile({ userId: 'me' })).data);
  }

  async listLabels(): Promise<gmail_v1.Schema$Label[]> {
    return this.call('listLabels', async () => (await this.gmail.users.labels.list({ userId: 'me' })).data.labels ?? []);
  }

  /** List message ids (metadata only). Handles a single page; caller paginates. */
  async listMessages(params: { pageToken?: string; maxResults?: number; q?: string }): Promise<gmail_v1.Schema$ListMessagesResponse> {
    return this.call('listMessages', async () =>
      (
        await this.gmail.users.messages.list({
          userId: 'me',
          maxResults: params.maxResults ?? 100,
          ...(params.pageToken ? { pageToken: params.pageToken } : {}),
          ...(params.q ? { q: params.q } : {}),
        })
      ).data,
    );
  }

  async getMessage(id: string): Promise<gmail_v1.Schema$Message> {
    return this.call('getMessage', async () =>
      (await this.gmail.users.messages.get({ userId: 'me', id, format: 'full' })).data,
    );
  }

  async getThread(id: string): Promise<gmail_v1.Schema$Thread> {
    return this.call('getThread', async () =>
      (await this.gmail.users.threads.get({ userId: 'me', id, format: 'full' })).data,
    );
  }

  /** Incremental sync: list history since a historyId watermark. */
  async listHistory(params: { startHistoryId: string; pageToken?: string }): Promise<gmail_v1.Schema$ListHistoryResponse> {
    return this.call('listHistory', async () =>
      (
        await this.gmail.users.history.list({
          userId: 'me',
          startHistoryId: params.startHistoryId,
          ...(params.pageToken ? { pageToken: params.pageToken } : {}),
          historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved'],
        })
      ).data,
    );
  }

  /** Send a raw RFC822 message (base64url). Returns the created message. */
  async sendRaw(raw: string, threadId?: string): Promise<gmail_v1.Schema$Message> {
    return this.call('sendMessage', async () =>
      (
        await this.gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw, ...(threadId ? { threadId } : {}) },
        })
      ).data,
    );
  }

  async modifyLabels(messageId: string, addLabelIds: string[], removeLabelIds: string[]): Promise<void> {
    await this.call('modifyLabels', async () =>
      this.gmail.users.messages.modify({ userId: 'me', id: messageId, requestBody: { addLabelIds, removeLabelIds } }),
    );
  }
}
