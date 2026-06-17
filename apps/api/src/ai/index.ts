import { env } from '../config/env.js';
import { childLogger } from '../observability/logger.js';
import { aiProviderFallbacks, aiRequestDuration, aiRequests, aiTokensUsed } from '../observability/metrics.js';
import { recordAi } from '../observability/sre.js';
import { geminiChat, geminiEmbeddings } from './gemini.js';
import { nimChat, nimEmbeddings } from './nim.js';
import type { ChatProvider, ChatTurn, EmbeddingProvider, GenerateOptions, GenerateResult } from './types.js';

const log = childLogger('ai');

/**
 * AI orchestration with provider fallback and full instrumentation.
 *
 * Chat/generation:  Gemini (primary) → NVIDIA NIM (secondary) on failure.
 *   This satisfies the "primary Gemini + secondary NIM" requirement and gives
 *   real resilience: a Gemini outage/quota exhaustion degrades gracefully
 *   instead of taking the product down.
 * Embeddings:       single provider chosen by EMBEDDING_PROVIDER (vectors from
 *   different models are not comparable, so we never silently mix them — the
 *   dimension is fixed per the DB column).
 */
const chatPrimary: ChatProvider = geminiChat;
const chatSecondary: ChatProvider = nimChat;

export const embeddingProvider: EmbeddingProvider =
  env.EMBEDDING_PROVIDER === 'nim' ? nimEmbeddings : geminiEmbeddings;

async function instrument(
  provider: string,
  operation: string,
  fn: () => Promise<GenerateResult>,
): Promise<GenerateResult> {
  const end = aiRequestDuration.startTimer({ provider, operation });
  try {
    const result = await fn();
    end();
    aiRequests.inc({ provider, operation, outcome: 'success' });
    aiTokensUsed.inc({ provider, kind: 'prompt' }, result.usage.promptTokens);
    aiTokensUsed.inc({ provider, kind: 'completion' }, result.usage.completionTokens);
    return result;
  } catch (err) {
    end();
    aiRequests.inc({ provider, operation, outcome: 'error' });
    throw err;
  }
}

/**
 * Generate text with automatic fallback to the secondary provider. Records the
 * outcome against the ai_success SLO so reliability is observable.
 */
export async function generateText(messages: ChatTurn[], opts: GenerateOptions): Promise<GenerateResult> {
  try {
    const result = await instrument(chatPrimary.name, opts.operation, () => chatPrimary.generate(messages, opts));
    recordAi(true);
    return result;
  } catch (primaryErr) {
    log.warn(
      { operation: opts.operation, err: primaryErr instanceof Error ? primaryErr.message : primaryErr },
      'primary AI provider failed; falling back to secondary',
    );
    aiProviderFallbacks.inc({ operation: opts.operation });
    try {
      const result = await instrument(chatSecondary.name, opts.operation, () =>
        chatSecondary.generate(messages, opts),
      );
      recordAi(true);
      return result;
    } catch (secondaryErr) {
      recordAi(false);
      log.error(
        { operation: opts.operation, err: secondaryErr instanceof Error ? secondaryErr.message : secondaryErr },
        'both AI providers failed',
      );
      throw secondaryErr;
    }
  }
}

/** Embed texts using the configured embedding provider. */
export async function embedTexts(texts: string[], taskType: 'query' | 'document' = 'document'): Promise<number[][]> {
  if (texts.length === 0) return [];
  const end = aiRequestDuration.startTimer({ provider: embeddingProvider.name, operation: 'embed' });
  try {
    const vectors = await embeddingProvider.embed(texts, taskType);
    end();
    aiRequests.inc({ provider: embeddingProvider.name, operation: 'embed', outcome: 'success' });
    recordAi(true);
    return vectors;
  } catch (err) {
    end();
    aiRequests.inc({ provider: embeddingProvider.name, operation: 'embed', outcome: 'error' });
    recordAi(false);
    throw err;
  }
}

export async function embedOne(text: string, taskType: 'query' | 'document' = 'query'): Promise<number[]> {
  const [vec] = await embedTexts([text], taskType);
  if (!vec) throw new Error('Embedding provider returned no vector');
  return vec;
}
