import * as React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** CSS width. Default '100%'. */
  width?: number | string;
  /** CSS height (ignored when circle). Default 14. */
  height?: number | string;
  /** Render a circle (width drives diameter). */
  circle?: boolean;
  /** Override border-radius. */
  radius?: number | string;
}

/** Shimmering placeholder for loading inbox rows, summaries, chat. */
export function Skeleton(props: SkeletonProps): JSX.Element;
