import * as React from 'react';

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Full name — drives initials and the deterministic tint color. */
  name?: string;
  /** Optional image URL; falls back to initials if absent. */
  src?: string;
  /** Size token or pixel number. Default 'md' (40px). */
  size?: 'xs' | 'sm' | 'md' | 'lg' | number;
  /** Rounded-square instead of circle. */
  square?: boolean;
}

/** Initials-on-tint avatar; tint is derived deterministically from the name. */
export function Avatar(props: AvatarProps): JSX.Element;
