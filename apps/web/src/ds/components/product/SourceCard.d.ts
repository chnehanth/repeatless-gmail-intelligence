import * as React from 'react';

export interface SourceCardProps {
  /** Citation index — a number (renders "S3") or a custom tag string. */
  index: number | string;
  /** Source email subject. */
  subject: string;
  /** Source sender. */
  sender?: string;
  /** Source date (relative or absolute). */
  date?: string;
  /** Click → open the originating thread in the inbox. */
  onClick?: () => void;
}

/** The [S#] citation card — the heart of the brand promise: every AI answer is traceable to its source email. Clicking opens that thread. */
export function SourceCard(props: SourceCardProps): JSX.Element;
