import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 'default' (white), 'ai' (faint blue wash for AI output), 'sunken' (gray). */
  tone?: 'default' | 'ai' | 'sunken';
  /** Apply 20px padding. Default true. */
  padded?: boolean;
  /** Lift shadow + pointer on hover (use for clickable rows/tiles). */
  hoverable?: boolean;
  /** Start at md elevation. */
  raised?: boolean;
  /** No shadow. */
  flat?: boolean;
}

/** White surface container — 14px radius, hairline border, soft shadow. */
export function Card(props: CardProps): JSX.Element;
