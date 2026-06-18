import * as React from 'react';

export interface SyncIndicatorProps {
  /** Sync state. Default 'synced'. */
  status?: 'synced' | 'syncing' | 'error';
  /** Total thread count (monospace). */
  threadCount?: number;
  /** Total message count (monospace). */
  messageCount?: number;
  /** Error message shown when status === 'error'. */
  error?: string;
  /** Refresh handler — triggers an incremental sync. */
  onRefresh?: () => void;
}

/** Sidebar live-sync status: pulsing dot, counts, refresh, last error. Designed for the dark sidebar. */
export function SyncIndicator(props: SyncIndicatorProps): JSX.Element;
