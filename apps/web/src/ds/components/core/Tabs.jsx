import React from 'react';

const CSS = `
.rl-tabs{display:flex;gap:4px;font-family:var(--font-sans);border-bottom:1px solid var(--border-subtle)}
.rl-tab{appearance:none;border:none;background:transparent;cursor:pointer;
  font-family:var(--font-sans);font-size:14px;font-weight:500;color:var(--text-muted);
  padding:10px 4px;margin:0 8px -1px 8px;border-bottom:2px solid transparent;
  transition:color var(--duration-fast),border-color var(--duration-fast)}
.rl-tab:first-child{margin-left:0}
.rl-tab:hover{color:var(--text-strong)}
.rl-tab--active{color:var(--accent);border-bottom-color:var(--accent)}
.rl-tab:focus-visible{outline:none;color:var(--accent)}
.rl-tab__count{font-family:var(--font-mono);font-size:11px;color:var(--text-subtle);margin-left:6px}
`;
let injected=false;
function useStyles(){ if(!injected&&typeof document!=='undefined'){const s=document.createElement('style');s.id='rl-tabs';s.textContent=CSS;if(!document.getElementById('rl-tabs'))document.head.appendChild(s);injected=true;} }

export function Tabs({ tabs = [], value, defaultValue, onChange, className = '' }) {
  useStyles();
  const [internal, setInternal] = React.useState(defaultValue ?? (tabs[0] && (tabs[0].value ?? tabs[0])));
  const active = value !== undefined ? value : internal;
  const select = (v) => { if (value === undefined) setInternal(v); onChange && onChange(v); };
  return (
    <div className={`rl-tabs ${className}`.trim()} role="tablist">
      {tabs.map((t) => {
        const v = t.value ?? t; const label = t.label ?? t;
        return (
          <button key={v} role="tab" aria-selected={active === v}
            className={`rl-tab${active === v ? ' rl-tab--active' : ''}`} onClick={() => select(v)}>
            {label}{t.count != null && <span className="rl-tab__count">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
