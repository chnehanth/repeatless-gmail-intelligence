import type { ChatMessage, ChatRequest } from '@repeatless/shared';
import { generateText } from '../ai/index.js';
import { CHAT_AGENT_SYSTEM } from '../ai/prompts.js';
import type { ChatTurn } from '../ai/types.js';
import {
  citedSources,
  renderSourceBlock,
  retrieveSources,
  type RetrievedSource,
} from './retrieval.service.js';
import { appendMessage, ensureSession, getRecentMessages } from '../repos/chat.repo.js';
import { chatGroundedResponses } from '../observability/metrics.js';
import { setOperation } from '../observability/context.js';
import { childLogger } from '../observability/logger.js';

const log = childLogger('service:chat');

export interface ChatAnswer {
  sessionId: string;
  message: ChatMessage;
}

/**
 * Answer a user question over their email knowledge base (RAG):
 *   1. retrieve the most relevant email chunks as numbered sources,
 *   2. prompt the model with strict grounding + attribution rules,
 *   3. record which sources it cited and persist the turn.
 *
 * Conversation history is included so follow-up questions are understood in
 * context. The query used for retrieval is condensed from recent turns so
 * pronoun-y follow-ups ("what about their pricing?") still retrieve well.
 */
export async function answerQuestion(userId: string, req: ChatRequest): Promise<ChatAnswer> {
  setOperation('chat.ask');
  const sessionId = await ensureSession(userId, req.sessionId, req.message);
  const history = await getRecentMessages(userId, sessionId, 10);

  await appendMessage(userId, sessionId, 'user', req.message);

  const retrievalQuery = buildRetrievalQuery(history, req.message);
  const sources = await retrieveSources(userId, retrievalQuery);

  const turns: ChatTurn[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    {
      role: 'user',
      content: `Sources from the user's inbox:\n\n${renderSourceBlock(sources)}\n\n---\nQuestion: ${req.message}\n\nAnswer using ONLY the sources above. Cite sources inline as [S#]. If the sources don't contain the answer, say so.`,
    },
  ];

  const { text } = await generateText(turns, {
    operation: 'chat.answer',
    system: CHAT_AGENT_SYSTEM,
    temperature: 0.2,
    maxOutputTokens: 1200,
  });

  const answer = text.trim();
  const citations = sources.length > 0 ? citedSources(answer, sources) : [];
  chatGroundedResponses.inc({ grounded: String(sources.length > 0) });

  const assistantMessage = await appendMessage(userId, sessionId, 'assistant', answer, citations);
  log.info({ userId, sessionId, sources: sources.length, cited: citations.length }, 'chat answered');

  return { sessionId, message: assistantMessage };
}

/** Combine the last user turn(s) with the new question to improve retrieval
 * recall for context-dependent follow-ups. */
function buildRetrievalQuery(history: ChatMessage[], current: string): string {
  const recentUser = history
    .filter((m) => m.role === 'user')
    .slice(-2)
    .map((m) => m.content);
  return [...recentUser, current].join('\n').slice(0, 2000);
}

export type { RetrievedSource };
