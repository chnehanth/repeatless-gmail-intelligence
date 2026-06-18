import React from 'react';
import { Icon } from './Icon.jsx';

const CSS = `
.rl-check{display:inline-flex;align-items:center;gap:9px;cursor:pointer;font-family:var(--font-sans);
  font-size:14px;color:var(--text-body);user-select:none}
.rl-check input{position:absolute;opacity:0;width:0;height:0}
.rl-check__box{width:18px;height:18px;border-radius:var(--radius-xs);border:1.5px solid var(--border-strong);
  background:var(--surface-card);display:flex;align-items:center;justify-content:center;flex:none;
  color:#fff;transition:background var(--duration-fast),border-color var(--duration-fast)}
.rl-check__box svg{opacity:0;transform:scale(.6);transition:opacity var(--duration-fast),transform var(--duration-fast) var(--ease-out)}
.rl-check input:checked + .rl-check__box{background:var(--accent);border-color:var(--accent)}
.rl-check input:checked + .rl-check__box svg{opacity:1;transform:scale(1)}
.rl-check input:focus-visible + .rl-check__box{box-shadow:var(--ring)}
.rl-check--off{opacity:.5;cursor:not-allowed}
`;
let injected=false;
function useStyles(){ if(!injected&&typeof document!=='undefined'){const s=document.createElement('style');s.id='rl-check';s.textContent=CSS;if(!document.getElementById('rl-check'))document.head.appendChild(s);injected=true;} }

export function Checkbox({ checked, defaultChecked, onChange, label, disabled, ...rest }) {
  useStyles();
  return (
    <label className={`rl-check${disabled ? ' rl-check--off' : ''}`}>
      <input type="checkbox" checked={checked} defaultChecked={defaultChecked} onChange={onChange} disabled={disabled} {...rest} />
      <span className="rl-check__box"><Icon name="check" size={13} strokeWidth={3} /></span>
      {label && <span>{label}</span>}
    </label>
  );
}
