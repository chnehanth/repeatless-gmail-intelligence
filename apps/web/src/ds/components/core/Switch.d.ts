import * as React from 'react';

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Optional label text shown after the track. */
  label?: string;
}

/** Toggle switch — used for the inbox "Unread only" filter and settings. */
export function Switch(props: SwitchProps): JSX.Element;
