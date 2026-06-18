import * as React from 'react';

export type IconName =
  | 'search' | 'sparkles' | 'send' | 'inbox' | 'refresh'
  | 'chevronRight' | 'chevronDown' | 'x' | 'check' | 'newspaper'
  | 'mail' | 'user' | 'logout' | 'pencil' | 'arrowUp' | 'clock' | 'filter';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  /** Lucide icon name from the curated Repeatless set. */
  name: IconName;
  /** Pixel size (width & height). Default 20. */
  size?: number;
  /** Stroke color. Default currentColor. */
  color?: string;
  /** Stroke width. Default 2. */
  strokeWidth?: number;
}

/** Lucide-based stroke icon, the Repeatless icon system. */
export function Icon(props: IconProps): JSX.Element;
