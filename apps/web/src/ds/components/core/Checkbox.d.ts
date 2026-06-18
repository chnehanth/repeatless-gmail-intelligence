import * as React from 'react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Optional label text. */
  label?: string;
}

/** Checkbox with the brand's electric-blue checked state. */
export function Checkbox(props: CheckboxProps): JSX.Element;
