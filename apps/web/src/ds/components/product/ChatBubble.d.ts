import * as React from 'react';

export interface ChatBubbleProps {
  /** 'user' (blue, right) or 'assistant' (left, with Repeatless avatar). Default 'assistant'. */
  role?: 'user' | 'assistant';
  /** Show the 3-dot typing indicator instead of children (assistant only). */
  typing?: boolean;
  /** Footer node — typically a row of SourceCards under an answer. */
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

/** Ask-AI chat bubble. User messages are blue/right; assistant answers carry the violet AI mark and can show a typing indicator. */
export function ChatBubble(props: ChatBubbleProps): JSX.Element;
