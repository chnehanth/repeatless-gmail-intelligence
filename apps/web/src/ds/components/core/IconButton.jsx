import React from 'react';
import { Icon } from './Icon.jsx';

const CSS = `
.rl-iconbtn{display:inline-flex;align-items:center;justify-content:center;cursor:pointer;
  background:transparent;border:1px solid transparent;color:var(--text-muted);
  border-radius:var(--radius-md);transition:background var(--duration-fast) var(--ease-standard),color var(--duration-fast),box-shadow var(--duration-fast);
  -webkit-tap-highlight-color:transparent}
.rl-iconbtn:hover{background:var(--surface-hover);color:var(--text-strong)}
.rl-iconbtn:active{background:var(--surface-active)}
.rl-iconbtn:focus-visible{outline:none;box-shadow:var(--ring)}
.rl-iconbtn[disabled]{opacity:.45;cursor:not-allowed}
.rl-iconbtn--sm{width:30px;height:30px}
.rl-iconbtn--md{width:36px;height:36px}
.rl-iconbtn--lg{width:42px;height:42px}
.rl-iconbtn--solid{background:var(--surface-card);border-color:var(--border-default)}
.rl-iconbtn--solid:hover{background:var(--surface-hover)}
`;
let injected = false;
function useStyles(){ if(!injected && typeof document!=='undefined'){const s=document.createElement('style');s.id='rl-iconbtn';s.textContent=CSS;if(!document.getElementById('rl-iconbtn'))document.head.appendChild(s);injected=true;} }

export function IconButton({ icon, size = 'md', variant = 'plain', label, className = '', ...rest }) {
  useStyles();
  const px = size === 'sm' ? 16 : size === 'lg' ? 20 : 18;
  return (
    <button
      className={`rl-iconbtn rl-iconbtn--${size}${variant === 'solid' ? ' rl-iconbtn--solid' : ''} ${className}`.trim()}
      aria-label={label}
      {...rest}
    >
      <Icon name={icon} size={px} />
    </button>
  );
}
