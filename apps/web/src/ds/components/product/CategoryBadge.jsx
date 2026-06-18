import React from 'react';

/** Inbox taxonomy → token color pair. */
const CATS = {
  work: 'work', personal: 'personal', finance: 'finance', travel: 'travel',
  shopping: 'shopping', social: 'social', newsletter: 'newsletter', newsletters: 'newsletter',
  updates: 'updates', update: 'updates', job: 'job', jobs: 'job', promotions: 'promotions', promo: 'promotions',
};

export function CategoryBadge({ category, size = 'md', dot = true, style, ...rest }) {
  const key = CATS[String(category || '').toLowerCase()] || 'updates';
  const pad = size === 'sm' ? '3px 9px' : '5px 11px';
  const fs = size === 'sm' ? 11 : 12;
  const label = String(category || 'Updates');
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)',
      fontWeight: 600, fontSize: fs, lineHeight: 1, padding: pad, borderRadius: 'var(--radius-full)',
      background: `var(--cat-${key}-bg)`, color: `var(--cat-${key}-fg)`,
      textTransform: 'capitalize', whiteSpace: 'nowrap', ...style,
    }} {...rest}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', opacity: 0.85 }} />}
      {label}
    </span>
  );
}
