import React from 'react';

const CSS = `
.rl-tone{display:inline-flex;gap:2px;padding:3px;background:var(--surface-sunken);
  border:1px solid var(--border-subtle);border-radius:var(--radius-md);font-family:var(--font-sans)}
.rl-tone__opt{appearance:none;border:none;background:transparent;cursor:pointer;
  font-family:var(--font-sans);font-size:13px;font-weight:500;color:var(--text-muted);
  padding:6px 13px;border-radius:var(--radius-sm);white-space:nowrap;
  transition:background var(--duration-fast),color var(--duration-fast),box-shadow var(--duration-fast)}
.rl-tone__opt:hover{color:var(--text-strong)}
.rl-tone__opt--active{background:var(--surface-card);color:var(--accent);box-shadow:var(--shadow-xs);font-weight:600}
.rl-tone__opt:focus-visible{outline:none;box-shadow:var(--ring)}
`;
let injected=false;
function useStyles(){ if(!injected&&typeof document!=='undefined'){const s=document.createElement('style');s.id='rl-tone';s.textContent=CSS;if(!document.getElementById('rl-tone'))document.head.appendChild(s);injected=true;} }

const DEFAULTS = ['Professional', 'Friendly', 'Concise', 'Formal'];

export function ToneSelector({ options = DEFAULTS, value, defaultValue, onChange }) {
  useStyles();
  const [internal, setInternal] = React.useState(defaultValue ?? options[0]);
  const active = value !== undefined ? value : internal;
  const select = (v) => { if (value === undefined) setInternal(v); onChange && onChange(v); };
  return (
    <div className="rl-tone" role="radiogroup" aria-label="Tone">
      {options.map((o) => (
        <button key={o} role="radio" aria-checked={active === o}
          className={`rl-tone__opt${active === o ? ' rl-tone__opt--active' : ''}`} onClick={() => select(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}
