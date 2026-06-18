import * as React from 'react';
import type { IconName } from './Icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. Default 'primary'. Use 'ai' for AI/agent actions. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'ai';
  /** Size. Default 'md'. */
  size?: 'sm' | 'md' | 'lg';
  /** Lucide icon name shown before the label. */
  leftIcon?: IconName;
  /** Lucide icon name shown after the label. */
  rightIcon?: IconName;
  /** Alias for leftIcon when there is no label (icon-only is better via IconButton). */
  icon?: IconName;
  /** Show a spinner and disable. */
  loading?: boolean;
  /** Stretch to container width. */
  fullWidth?: boolean;
}

/** The brand's button. Primary = electric blue; 'ai' = violet for agent actions. */
export function Button(props: ButtonProps): JSX.Element;
