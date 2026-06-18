import React from 'react';

const CSS = `
.rl-source{display:inline-flex;align-items:center;gap:10px;text-align:left;cursor:pointer;
  background:var(--surface-card);border:1px solid var(--border-default);border-radius:var(--radius-lg);
  padding:9px 12px 9px 10px;font-family:var(--font-sans);max-width:280px;
  transition:border-color var(--duration-fast),box-shadow var(--duration-fast),transform var(--duration-fast)}
.rl-source:hover{border-color:var(--blue-300);box-shadow:var(--shadow-sm);transform:translateY(-1px)}
.rl-source:focus-visible{outline:none;box-shadow:var(--ring)}
.rl-source__tag{font-family:var(--font-mono);font-size:11px;font-weight:600;color:var(--blue-600);
  background:var(--blue-50);border-radius:var(--radius-sm);padding:3px 6px;flex:none;line-height:1}
.rl-source__body{min-width:0}
.rl-source__subj{font-size:12.5px;font-weight:600;color:var(--text-strong);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rl-source__meta{font-family:var(--font-mono);font-size:10.5px;color:var(--text-subtle);margin-top:2px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
`;
let injected=false;
function useStyles(){ if(!injected&&typeof document!=='undefined'){const s=document.createElement('style');s.id='rl-source';s.textContent=CSS;if(!document.getElementById('rl-source'))document.head.appendChild(s);injected=true;} }

export function SourceCard({ index, subject, sender, date, onClick }) {
  useStyles();
  const tag = typeof index === 'number' ? `S${index}` : index;
  return (
    <button className="rl-source" onClick={onClick} title={subject}>
      <span className="rl-source__tag">{tag}</span>
      <span className="rl-source__body">
        <span className="rl-source__subj">{subject}</span>
        <span className="rl-source__meta">{[sender, date].filter(Boolean).join(' · ')}</span>
      </span>
    </button>
  );
}
