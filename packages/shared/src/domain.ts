import type { EmailCategory } from './categories.js';

/** A participant on an email (parsed from From/To/Cc headers). */
export interface EmailAddress {
  name: string | null;
  email: string;
}

export type SyncStatus = 'idle' | 'initial' | 'incremental' | 'error';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
}

export interface GmailLabel {
  id: string;
  name: string;
  type: 'system' | 'user';
}

/** A single message within a thread. */
export interface EmailMessage {
  id: string;
  gmailMessageId: string;
  threadId: string;
  fromAddress: EmailAddress | null;
  toAddresses: EmailAddress[];
  ccAddresses: EmailAddress[];
  subject: string | null;
  snippet: string | null;
  bodyText: string | null;
  internalDate: string;
  labelIds: string[];
  /** RFC 2822 Message-ID header value — needed for threaded replies. */
  rfcMessageId: string | null;
  inReplyTo: string | null;
  references: string[];
  isUnread: boolean;
  summary: string | null;
}

export interface EmailThread {
  id: string;
  gmailThreadId: string;
  subject: string | null;
  category: EmailCategory | null;
  categoryConfidence: number | null;
  summary: string | null;
  participants: EmailAddress[];
  messageCount: number;
  lastMessageAt: string;
  isUnread: boolean;
  messages?: EmailMessage[];
}

/** A citation linking an AI claim back to a specific source message/thread. */
export interface SourceCitation {
  threadId: string;
  messageId: string | null;
  subject: string | null;
  sender: string | null;
  date: string | null;
  snippet: string | null;
}

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  citations: SourceCitation[];
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A unique news story after newsletter deduplication. */
export interface NewsItem {
  title: string;
  summary: string;
  sources: SourceCitation[];
}
