import React from 'react';

const CSS = `
.rl-card{background:var(--surface-card);border:1px solid var(--border-subtle);
  border-radius:var(--radius-xl);box-shadow:var(--shadow-sm);
  transition:box-shadow var(--duration-base) var(--ease-standard),border-color var(--duration-base),transform var(--duration-base)}
.rl-card--pad{padding:20px}
.rl-card--hover{cursor:pointer}
.rl-card--hover:hover{box-shadow:var(--shadow-md);border-color:var(--border-default)}
.rl-card--raised{box-shadow:var(--shadow-md)}
.rl-card--flat{box-shadow:none}
.rl-card--ai{background:var(--surface-ai);border-color:var(--blue-100)}
.rl-card--sunken{background:var(--surface-sunken);box-shadow:none;border-color:var(--border-subtle)}
`;
let injected=false;
function useStyles(){ if(!injected&&typeof document!=='undefined'){const s=document.createElement('style');s.id='rl-card';s.textContent=CSS;if(!document.getElementById('rl-card'))document.head.appendChild(s);injected=true;} }

export function Card({ tone = 'default', padded = true, hoverable = false, raised = false, flat = false, children, className = '', ...rest }) {
  useStyles();
  const cls = [
    'rl-card',
    padded && 'rl-card--pad',
    hoverable && 'rl-card--hover',
    raised && 'rl-card--raised',
    flat && 'rl-card--flat',
    tone === 'ai' && 'rl-card--ai',
    tone === 'sunken' && 'rl-card--sunken',
    className,
  ].filter(Boolean).join(' ');
  return <div className={cls} {...rest}>{children}</div>;
}
