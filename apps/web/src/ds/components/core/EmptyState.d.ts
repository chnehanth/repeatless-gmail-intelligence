import * as React from 'react';
import type { IconName } from './Icon';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lucide icon in the tile. Default 'inbox'. */
  icon?: IconName;
  /** Headline (sentence case, warm). */
  title: string;
  /** Supporting line. */
  description?: string;
  /** Optional action node (e.g. a Button). */
  action?: React.ReactNode;
}

/** Friendly empty state for cleared inboxes, no search results, fresh chat. */
export function EmptyState(props: EmptyStateProps): JSX.Element;
