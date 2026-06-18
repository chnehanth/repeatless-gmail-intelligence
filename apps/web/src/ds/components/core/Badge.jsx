import React from 'react';

const CSS = `
.rl-badge{display:inline-flex;align-items:center;gap:5px;font-family:var(--font-sans);
  font-weight:600;line-height:1;border-radius:var(--radius-full);white-space:nowrap}
.rl-badge--sm{font-size:11px;padding:3px 8px}
.rl-badge--md{font-size:12px;padding:5px 11px}
.rl-badge__dot{width:6px;height:6px;border-radius:50%;background:currentColor}
.rl-badge--neutral{background:var(--ink-100);color:var(--ink-600)}
.rl-badge--blue{background:var(--blue-50);color:var(--blue-600)}
.rl-badge--success{background:var(--success-soft);color:var(--green-700)}
.rl-badge--warning{background:var(--warning-soft);color:var(--amber-600)}
.rl-badge--danger{background:var(--danger-soft);color:var(--red-600)}
.rl-badge--ai{background:var(--ai-soft);color:var(--violet-600)}
.rl-badge--count{background:var(--ink-100);color:var(--ink-600);min-width:20px;justify-content:center;
  padding:3px 7px;font-family:var(--font-mono);font-size:11px}
`;
let injected=false;
function useStyles(){ if(!injected&&typeof document!=='undefined'){const s=document.createElement('style');s.id='rl-badge';s.textContent=CSS;if(!document.getElementById('rl-badge'))document.head.appendChild(s);injected=true;} }

export function Badge({ variant = 'neutral', size = 'md', dot = false, count = false, children, className = '', ...rest }) {
  useStyles();
  const cls = count ? 'rl-badge rl-badge--count' : `rl-badge rl-badge--${variant} rl-badge--${size}`;
  return <span className={`${cls} ${className}`.trim()} {...rest}>{dot && <span className="rl-badge__dot" />}{children}</span>;
}
