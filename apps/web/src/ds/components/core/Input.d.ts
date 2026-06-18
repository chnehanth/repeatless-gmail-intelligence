import * as React from 'react';
import type { IconName } from './Icon';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Field label rendered above the input. */
  label?: string;
  /** Helper text below the field. */
  hint?: string;
  /** Error message; turns the field red and overrides hint. */
  error?: string;
  /** Lucide icon name inside the field, left side. */
  leftIcon?: IconName;
  /** Node rendered at the right edge inside the field (e.g. a clear button). */
  rightSlot?: React.ReactNode;
  /** Size. Default 'md'. */
  size?: 'sm' | 'md';
}

/** Text input with label, hint, error, and optional leading icon. */
export function Input(props: InputProps): JSX.Element;
