import * as React from 'react';

export type Category =
  | 'Work' | 'Personal' | 'Finance' | 'Travel' | 'Shopping'
  | 'Social' | 'Newsletter' | 'Updates' | 'Job' | 'Promotions';

export interface CategoryBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Category name (case-insensitive). Unknown values fall back to Updates. */
  category: Category | string;
  /** Size. Default 'md'. */
  size?: 'sm' | 'md';
  /** Show the leading dot. Default true. */
  dot?: boolean;
}

/** The inbox category pill — one brand hue per taxonomy category. */
export function CategoryBadge(props: CategoryBadgeProps): JSX.Element;
