import React from 'react';
import { Icon } from './Icon.jsx';

const CSS = `
.rl-field{display:flex;flex-direction:column;gap:6px;font-family:var(--font-sans)}
.rl-field__label{font-size:13px;font-weight:500;color:var(--text-strong)}
.rl-field__hint{font-size:12px;color:var(--text-muted)}
.rl-field__err{font-size:12px;color:var(--danger);font-weight:500}
.rl-input{display:flex;align-items:center;gap:9px;background:var(--surface-card);
  border:1px solid var(--border-default);border-radius:var(--radius-md);
  padding:0 12px;height:40px;transition:border-color var(--duration-fast),box-shadow var(--duration-fast)}
.rl-input:focus-within{border-color:var(--border-focus);box-shadow:var(--ring)}
.rl-input--err{border-color:var(--danger)}
.rl-input--err:focus-within{box-shadow:var(--ring-danger)}
.rl-input__icon{color:var(--text-subtle);flex:none}
.rl-input input{flex:1;border:none;outline:none;background:transparent;
  font-family:var(--font-sans);font-size:14px;color:var(--text-strong);min-width:0}
.rl-input input::placeholder{color:var(--text-subtle)}
.rl-input--sm{height:34px}
`;
let injected=false;
function useStyles(){ if(!injected&&typeof document!=='undefined'){const s=document.createElement('style');s.id='rl-input';s.textContent=CSS;if(!document.getElementById('rl-input'))document.head.appendChild(s);injected=true;} }

export function Input({ label, hint, error, leftIcon, rightSlot, size = 'md', id, className = '', ...rest }) {
  useStyles();
  const fid = id || (label ? 'rl-' + label.replace(/\s+/g, '-').toLowerCase() : undefined);
  return (
    <div className={`rl-field ${className}`.trim()}>
      {label && <label className="rl-field__label" htmlFor={fid}>{label}</label>}
      <div className={`rl-input${size === 'sm' ? ' rl-input--sm' : ''}${error ? ' rl-input--err' : ''}`}>
        {leftIcon && <span className="rl-input__icon"><Icon name={leftIcon} size={17} /></span>}
        <input id={fid} {...rest} />
        {rightSlot}
      </div>
      {error ? <span className="rl-field__err">{error}</span> : hint ? <span className="rl-field__hint">{hint}</span> : null}
    </div>
  );
}
