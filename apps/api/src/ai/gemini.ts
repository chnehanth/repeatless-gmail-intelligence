import { GoogleGenerativeAI, type Content } from '@google/generative-ai';
import { env } from '../config/env.js';
import { childLogger } from '../observability/logger.js';
import { aiError } from '../lib/errors.js';
import { withRetry } from '../lib/retry.js';
import { mapWithConcurrency } from '../lib/concurrency.js';
import type { ChatProvider, ChatTurn, EmbeddingProvider, GenerateOptions, GenerateResult } from './types.js';

const log = childLogger('ai:gemini');
const client = new GoogleGenerativeAI(env.GEMINI_API_KEY);

const GEMINI_REST_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/** Gemini errors worth retrying: 429 (rate), 500/503 (transient). */
function isRetryable(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return /429|rate|quota|500|503|timeout|unavailable|overloaded|deadline/.test(msg);
}

/** Rough token estimate (~4 chars/token) — providers don't always return usage. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function toGeminiContents(messages: ChatTurn[]): Content[] {
  // Gemini has no "system" role in history; system is passed separately.
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
}

export const geminiChat: ChatProvider = {
  name: 'gemini',
  async generate(messages: ChatTurn[], opts: GenerateOptions): Promise<GenerateResult> {
    const systemFromMessages = messages.find((m) => m.role === 'system')?.content;
    const systemInstruction = opts.system ?? systemFromMessages;

    // Disable "thinking" on Gemini 2.5 flash models. These calls are
    // latency-sensitive structured tasks (summaries, JSON classification,
    // grounded chat) with bounded output budgets; thinking tokens would
    // otherwise consume the maxOutputTokens budget and can leave the visible
    // answer empty. `thinkingConfig` isn't in the pinned SDK's types but is
    // passed through to the API, so we attach it via a typed-through config.
    const generationConfig = {
      temperature: opts.temperature ?? 0.3,
      maxOutputTokens: opts.maxOutputTokens ?? 2048,
      thinkingConfig: { thinkingBudget: 0 },
      ...(opts.json ? { responseMimeType: 'application/json' } : {}),
    };

    const model = client.getGenerativeModel({
      model: env.GEMINI_CHAT_MODEL,
      ...(systemInstruction ? { systemInstruction } : {}),
      generationConfig: generationConfig as unknown as Parameters<
        typeof client.getGenerativeModel
      >[0]['generationConfig'],
    });

    const contents = toGeminiContents(messages);
    return withRetry(
      async () => {
        const result = await model.generateContent({ contents });
        const text = result.response.text();
        const usage = result.response.usageMetadata;
        return {
          text,
          provider: this.name,
          usage: {
            promptTokens: usage?.promptTokenCount ?? estimateTokens(JSON.stringify(contents)),
            completionTokens: usage?.candidatesTokenCount ?? estimateTokens(text),
          },
        };
      },
      { label: `gemini.${opts.operation}`, isRetryable, retries: 4 },
    ).catch((err) => {
      log.error({ err: err instanceof Error ? err.message : err, operation: opts.operation }, 'gemini generate failed');
      throw aiError('Gemini generation failed', err);
    });
  },
};

export const geminiEmbeddings: EmbeddingProvider = {
  name: 'gemini',
  dimensions: env.EMBEDDING_DIMENSIONS,
  /**
   * Embeds via the REST `embedContent` endpoint (one call per text, bounded
   * concurrency). We bypass the SDK's `batchEmbedContents` because current
   * Gemini embedding models (e.g. gemini-embedding-001) expose `embedContent`
   * (not batch) and require `outputDimensionality` to emit vectors matching the
   * `vector(768)` DB column — a parameter the pinned SDK does not support.
   */
  async embed(texts: string[], taskType: 'query' | 'document' = 'document'): Promise<number[][]> {
    if (texts.length === 0) return [];
    const mappedTaskType = taskType === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT';
    const model = env.GEMINI_EMBEDDING_MODEL.startsWith('models/')
      ? env.GEMINI_EMBEDDING_MODEL
      : `models/${env.GEMINI_EMBEDDING_MODEL}`;
    const url = `${GEMINI_REST_BASE}/${model}:embedContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`;

    try {
      return await mapWithConcurrency(texts, 5, (text) =>
        withRetry(
          async () => {
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model,
                content: { parts: [{ text }] },
                taskType: mappedTaskType,
                outputDimensionality: env.EMBEDDING_DIMENSIONS,
              }),
            });
            if (!res.ok) {
              const body = await res.text();
              const err = new Error(`Gemini embedContent ${res.status}: ${body.slice(0, 200)}`);
              (err as { status?: number }).status = res.status;
              throw err;
            }
            const json = (await res.json()) as { embedding?: { values?: number[] } };
            const values = json.embedding?.values;
            if (!values || values.length === 0) throw new Error('Gemini embedContent returned no values');
            return values;
          },
          { label: 'gemini.embed', isRetryable, retries: 4 },
        ),
      );
    } catch (err) {
      log.error({ err: err instanceof Error ? err.message : err }, 'gemini embed failed');
      throw aiError('Gemini embedding failed', err);
    }
  },
};
