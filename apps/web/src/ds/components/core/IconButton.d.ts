import * as React from 'react';
import type { IconName } from './Icon';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Lucide icon name. */
  icon: IconName;
  /** Size. Default 'md'. */
  size?: 'sm' | 'md' | 'lg';
  /** 'plain' (transparent) or 'solid' (white + border). Default 'plain'. */
  variant?: 'plain' | 'solid';
  /** Accessible label (required — icon-only control). */
  label: string;
}

/** Icon-only button for toolbars, list-row actions, modal close. */
export function IconButton(props: IconButtonProps): JSX.Element;
