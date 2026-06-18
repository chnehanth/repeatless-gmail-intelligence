import React from 'react';

const CSS = `
.rl-switch{display:inline-flex;align-items:center;gap:10px;cursor:pointer;font-family:var(--font-sans);font-size:14px;color:var(--text-body);user-select:none}
.rl-switch input{position:absolute;opacity:0;width:0;height:0}
.rl-switch__track{width:38px;height:22px;border-radius:var(--radius-full);background:var(--ink-200);
  position:relative;transition:background var(--duration-base) var(--ease-standard);flex:none}
.rl-switch__thumb{position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;
  background:#fff;box-shadow:var(--shadow-sm);transition:transform var(--duration-base) var(--ease-out)}
.rl-switch input:checked + .rl-switch__track{background:var(--accent)}
.rl-switch input:checked + .rl-switch__track .rl-switch__thumb{transform:translateX(16px)}
.rl-switch input:focus-visible + .rl-switch__track{box-shadow:var(--ring)}
.rl-switch--off{opacity:.5;cursor:not-allowed}
`;
let injected=false;
function useStyles(){ if(!injected&&typeof document!=='undefined'){const s=document.createElement('style');s.id='rl-switch';s.textContent=CSS;if(!document.getElementById('rl-switch'))document.head.appendChild(s);injected=true;} }

export function Switch({ checked, defaultChecked, onChange, label, disabled, ...rest }) {
  useStyles();
  return (
    <label className={`rl-switch${disabled ? ' rl-switch--off' : ''}`}>
      <input type="checkbox" checked={checked} defaultChecked={defaultChecked} onChange={onChange} disabled={disabled} {...rest} />
      <span className="rl-switch__track"><span className="rl-switch__thumb" /></span>
      {label && <span>{label}</span>}
    </label>
  );
}
