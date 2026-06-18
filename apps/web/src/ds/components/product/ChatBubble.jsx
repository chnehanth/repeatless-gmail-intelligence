import React from 'react';

const CSS = `
.rl-bubble{font-family:var(--font-sans);max-width:78%;font-size:14px;line-height:1.55}
.rl-bubble--user{align-self:flex-end;background:var(--accent);color:#fff;
  padding:11px 15px;border-radius:16px 16px 4px 16px}
.rl-bubble--assistant{align-self:flex-start;color:var(--text-body);max-width:100%}
.rl-bubble__typing{display:inline-flex;gap:4px;align-items:center;padding:4px 2px}
.rl-bubble__typing span{width:7px;height:7px;border-radius:50%;background:var(--ai);
  animation:rl-typing 1.2s var(--ease-standard) infinite}
.rl-bubble__typing span:nth-child(2){animation-delay:.15s}
.rl-bubble__typing span:nth-child(3){animation-delay:.3s}
@keyframes rl-typing{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-4px);opacity:1}}
@media (prefers-reduced-motion:reduce){.rl-bubble__typing span{animation:none}}
.rl-bubble__role{display:flex;align-items:center;gap:7px;margin-bottom:7px}
.rl-bubble__avatar{width:22px;height:22px;border-radius:6px;background:var(--ai-soft);color:var(--ai);
  display:flex;align-items:center;justify-content:center;flex:none}
.rl-bubble__name{font-size:12px;font-weight:600;color:var(--text-muted)}
`;
let injected=false;
function useStyles(){ if(!injected&&typeof document!=='undefined'){const s=document.createElement('style');s.id='rl-bubble';s.textContent=CSS;if(!document.getElementById('rl-bubble'))document.head.appendChild(s);injected=true;} }

const Spark = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"/></svg>
);

export function ChatBubble({ role = 'assistant', typing = false, children, footer }) {
  useStyles();
  if (role === 'user') return <div className="rl-bubble rl-bubble--user">{children}</div>;
  return (
    <div className="rl-bubble rl-bubble--assistant">
      <div className="rl-bubble__role">
        <span className="rl-bubble__avatar"><Spark /></span>
        <span className="rl-bubble__name">Repeatless</span>
      </div>
      {typing ? (
        <div className="rl-bubble__typing"><span /><span /><span /></div>
      ) : children}
      {footer}
    </div>
  );
}
