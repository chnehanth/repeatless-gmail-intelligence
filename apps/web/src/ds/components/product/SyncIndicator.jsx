import React from 'react';
import { IconButton } from '../core/IconButton.jsx';

const CSS = `
.rl-sync{font-family:var(--font-sans)}
.rl-sync__pulse{width:8px;height:8px;border-radius:50%;flex:none;position:relative}
.rl-sync__pulse::after{content:'';position:absolute;inset:0;border-radius:50%;background:inherit}
.rl-sync--syncing .rl-sync__pulse::after{animation:rl-pulse 1.4s var(--ease-standard) infinite}
@keyframes rl-pulse{0%{transform:scale(1);opacity:.6}70%{transform:scale(2.6);opacity:0}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.rl-sync--syncing .rl-sync__pulse::after{animation:none}}
`;
let injected=false;
function useStyles(){ if(!injected&&typeof document!=='undefined'){const s=document.createElement('style');s.id='rl-sync';s.textContent=CSS;if(!document.getElementById('rl-sync'))document.head.appendChild(s);injected=true;} }

const TONE = {
  synced:  { color: 'var(--green-500)', label: 'Synced' },
  syncing: { color: 'var(--blue-400)', label: 'Syncing…' },
  error:   { color: 'var(--red-500)', label: "Couldn't sync" },
};

export function SyncIndicator({ status = 'synced', threadCount, messageCount, error, onRefresh }) {
  useStyles();
  const t = TONE[status] || TONE.synced;
  return (
    <div className={`rl-sync rl-sync--${status}`} style={{
      display: 'flex', flexDirection: 'column', gap: 6,
      padding: 12, borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="rl-sync__pulse" style={{ background: t.color }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.92)', flex: 1 }}>{t.label}</span>
        {onRefresh && (
          <button onClick={onRefresh} aria-label="Refresh" style={{
            display: 'inline-flex', border: 'none', background: 'transparent', cursor: 'pointer',
            color: 'rgba(255,255,255,0.6)', padding: 2, borderRadius: 6,
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
          </button>
        )}
      </div>
      {status === 'error' && error ? (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,180,180,0.9)' }}>{error}</span>
      ) : (threadCount != null || messageCount != null) ? (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
          {threadCount != null && `${threadCount.toLocaleString()} threads`}
          {threadCount != null && messageCount != null && ' · '}
          {messageCount != null && `${messageCount.toLocaleString()} messages`}
        </span>
      ) : null}
    </div>
  );
}
