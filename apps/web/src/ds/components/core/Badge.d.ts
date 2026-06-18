import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Color/intent. Default 'neutral'. */
  variant?: 'neutral' | 'blue' | 'success' | 'warning' | 'danger' | 'ai';
  /** Size. Default 'md'. */
  size?: 'sm' | 'md';
  /** Show a leading status dot. */
  dot?: boolean;
  /** Render as a monospace count pill (e.g. message counts). Overrides variant. */
  count?: boolean;
}

/** Small status / label pill. Use `count` for the monospace message-count pill. */
export function Badge(props: BadgeProps): JSX.Element;
