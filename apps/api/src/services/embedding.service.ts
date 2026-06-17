import { env } from '../config/env.js';
import { childLogger } from '../observability/logger.js';
import { embedTexts, embeddingProvider } from '../ai/index.js';
import { chunkText, truncate } from '../lib/text.js';
import { getMessageById } from '../repos/messages.repo.js';
import { replaceMessageEmbeddings, type EmbeddingInput } from '../repos/embeddings.repo.js';

const log = childLogger('service:embedding');

/**
 * Build the text we embed for a message: subject + sender + body. Including the
 * subject and sender in each chunk improves retrieval for queries like
 * "emails from Acme" without a separate metadata filter.
 */
function buildEmbeddingText(subject: string | null, sender: string | null, body: string): string {
  const header = [subject ? `Subject: ${subject}` : null, sender ? `From: ${sender}` : null]
    .filter(Boolean)
    .join('\n');
  return header ? `${header}\n\n${body}` : body;
}

/** Embed a single message's body into one or more chunk vectors. */
export async function embedMessage(userId: string, messageId: string): Promise<number> {
  const message = await getMessageById(userId, messageId);
  if (!message) return 0;
  const body = message.bodyText ?? message.snippet ?? '';
  if (!body.trim()) return 0;

  const senderLabel = message.fromAddress
    ? `${message.fromAddress.name ?? ''} <${message.fromAddress.email}>`.trim()
    : null;

  const chunks = chunkText(buildEmbeddingText(message.subject, senderLabel, body));
  if (chunks.length === 0) return 0;

  const vectors = await embedTexts(chunks, 'document');
  const inputs: EmbeddingInput[] = vectors.map((embedding, i) => ({
    messageId,
    threadId: message.threadId,
    chunkIndex: i,
    content: truncate(chunks[i] ?? '', 4000),
    embedding,
    model: `${embeddingProvider.name}:${env.EMBEDDING_PROVIDER === 'nim' ? env.NIM_EMBEDDING_MODEL : env.GEMINI_EMBEDDING_MODEL}`,
  }));

  await replaceMessageEmbeddings(userId, messageId, inputs);
  log.debug({ userId, messageId, chunks: chunks.length }, 'embedded message');
  return chunks.length;
}
