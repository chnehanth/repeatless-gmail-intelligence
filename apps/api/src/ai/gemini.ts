import { GoogleGenerativeAI, type Content } from '@google/generative-ai';
import { env } from '../config/env.js';
import { childLogger } from '../observability/logger.js';
import { aiError } from '../lib/errors.js';
import { withRetry } from '../lib/retry.js';
import type { ChatProvider, ChatTurn, EmbeddingProvider, GenerateOptions, GenerateResult } from './types.js';

const log = childLogger('ai:gemini');
const client = new GoogleGenerativeAI(env.GEMINI_API_KEY);

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

    const model = client.getGenerativeModel({
      model: env.GEMINI_CHAT_MODEL,
      ...(systemInstruction ? { systemInstruction } : {}),
      generationConfig: {
        temperature: opts.temperature ?? 0.3,
        maxOutputTokens: opts.maxOutputTokens ?? 2048,
        ...(opts.json ? { responseMimeType: 'application/json' } : {}),
      },
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
  async embed(texts: string[], taskType: 'query' | 'document' = 'document'): Promise<number[][]> {
    if (texts.length === 0) return [];
    const model = client.getGenerativeModel({ model: env.GEMINI_EMBEDDING_MODEL });
    const mappedTaskType = taskType === 'query' ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT';

    return withRetry(
      async () => {
        const res = await model.batchEmbedContents({
          requests: texts.map((text) => ({
            content: { role: 'user', parts: [{ text }] },
            taskType: mappedTaskType as never,
          })),
        });
        return res.embeddings.map((e) => e.values);
      },
      { label: 'gemini.embed', isRetryable, retries: 4 },
    ).catch((err) => {
      log.error({ err: err instanceof Error ? err.message : err }, 'gemini embed failed');
      throw aiError('Gemini embedding failed', err);
    });
  },
};
