import * as React from 'react';
import type { Category } from './CategoryBadge';

export interface ThreadRowProps {
  /** Sender name — drives the avatar. */
  sender: string;
  /** Subject line (bold when unread). */
  subject: string;
  /** AI summary (2-line preview). Falls back to "Summary pending…" when empty. */
  summary?: string;
  /** Relative date string, e.g. "2h", "Yesterday", "Mar 4". */
  date: string;
  /** Message count; a pill shows when > 1. */
  messageCount?: number;
  /** Category for the badge. */
  category?: Category | string;
  /** Unread → bold subject + blue rail. */
  unread?: boolean;
  onClick?: () => void;
}

/** A single inbox thread row: avatar, subject, AI summary, count, date, category. */
export function ThreadRow(props: ThreadRowProps): JSX.Element;
