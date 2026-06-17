import OpenAI from 'openai';
import { env } from '../config/env.js';
import { childLogger } from '../observability/logger.js';
import { aiError } from '../lib/errors.js';
import { withRetry } from '../lib/retry.js';
import type { ChatProvider, ChatTurn, EmbeddingProvider, GenerateOptions, GenerateResult } from './types.js';

const log = childLogger('ai:nim');

/**
 * NVIDIA NIM exposes an OpenAI-compatible API, so we reuse the OpenAI SDK with
 * a custom baseURL. Used as the secondary/fallback chat provider and as an
 * alternate embedding provider (EMBEDDING_PROVIDER=nim).
 */
const client = new OpenAI({ apiKey: env.NIM_API_KEY, baseURL: env.NIM_BASE_URL });

function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status && [429, 500, 502, 503, 504].includes(status)) return true;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return /429|rate|timeout|unavailable|temporarily/.test(msg);
}

export const nimChat: ChatProvider = {
  name: 'nim',
  async generate(messages: ChatTurn[], opts: GenerateOptions): Promise<GenerateResult> {
    const msgs = [...messages];
    if (opts.system && !msgs.some((m) => m.role === 'system')) {
      msgs.unshift({ role: 'system', content: opts.system });
    }

    return withRetry(
      async () => {
        const res = await client.chat.completions.create(
          {
            model: env.NIM_CHAT_MODEL,
            messages: msgs.map((m) => ({ role: m.role, content: m.content })),
            temperature: opts.temperature ?? 0.3,
            max_tokens: opts.maxOutputTokens ?? 2048,
            ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
          },
          opts.signal ? { signal: opts.signal } : {},
        );
        const text = res.choices[0]?.message?.content ?? '';
        return {
          text,
          provider: this.name,
          usage: {
            promptTokens: res.usage?.prompt_tokens ?? 0,
            completionTokens: res.usage?.completion_tokens ?? 0,
          },
        };
      },
      { label: `nim.${opts.operation}`, isRetryable, retries: 3 },
    ).catch((err) => {
      log.error({ err: err instanceof Error ? err.message : err, operation: opts.operation }, 'nim generate failed');
      throw aiError('NIM generation failed', err);
    });
  },
};

export const nimEmbeddings: EmbeddingProvider = {
  name: 'nim',
  dimensions: env.EMBEDDING_DIMENSIONS,
  async embed(texts: string[], taskType: 'query' | 'document' = 'document'): Promise<number[][]> {
    if (texts.length === 0) return [];
    return withRetry(
      async () => {
        const res = await client.embeddings.create({
          model: env.NIM_EMBEDDING_MODEL,
          input: texts,
          // NIM e5 models distinguish passage/query encoding for better recall.
          ...({ input_type: taskType === 'query' ? 'query' : 'passage' } as Record<string, unknown>),
        });
        return res.data.map((d) => d.embedding as number[]);
      },
      { label: 'nim.embed', isRetryable, retries: 3 },
    ).catch((err) => {
      log.error({ err: err instanceof Error ? err.message : err }, 'nim embed failed');
      throw aiError('NIM embedding failed', err);
    });
  },
};
