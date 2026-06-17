import { z } from 'zod';
import { EMAIL_CATEGORIES } from './categories.js';

/** Standard error envelope returned by the API for all non-2xx responses. */
export interface ApiError {
  error: {
    code: string;
    message: string;
    /** Correlation id — present on every response, echo it in bug reports. */
    requestId: string;
    details?: unknown;
  };
}

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export const listThreadsQuerySchema = paginationQuerySchema.extend({
  category: z.enum(EMAIL_CATEGORIES).optional(),
  unreadOnly: z.coerce.boolean().optional(),
  search: z.string().trim().min(1).max(200).optional(),
});
export type ListThreadsQuery = z.infer<typeof listThreadsQuerySchema>;

export const composeRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
  tone: z.enum(['professional', 'friendly', 'concise', 'formal']).default('professional'),
});
export type ComposeRequest = z.infer<typeof composeRequestSchema>;

export const replyRequestSchema = z.object({
  threadId: z.string().min(1),
  prompt: z.string().trim().min(1).max(4000),
  tone: z.enum(['professional', 'friendly', 'concise', 'formal']).default('professional'),
});
export type ReplyRequest = z.infer<typeof replyRequestSchema>;

export interface DraftResponse {
  to: string[];
  cc: string[];
  subject: string;
  body: string;
  /** Present for replies — used to thread the message correctly in Gmail. */
  threadId?: string;
  inReplyTo?: string;
  references?: string[];
}

export const sendEmailSchema = z.object({
  to: z.array(z.string().email()).min(1),
  cc: z.array(z.string().email()).default([]),
  subject: z.string().max(998),
  body: z.string(),
  threadId: z.string().optional(),
  inReplyTo: z.string().optional(),
  references: z.array(z.string()).optional(),
});
export type SendEmailRequest = z.infer<typeof sendEmailSchema>;

export const chatRequestSchema = z.object({
  sessionId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(4000),
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;

export const newsDigestQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(30).default(4),
});
export type NewsDigestQuery = z.infer<typeof newsDigestQuerySchema>;

export const triggerSyncSchema = z.object({
  mode: z.enum(['full', 'incremental']).default('incremental'),
});
export type TriggerSyncRequest = z.infer<typeof triggerSyncSchema>;
