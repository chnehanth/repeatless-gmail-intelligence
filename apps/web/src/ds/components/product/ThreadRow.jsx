import React from 'react';
import { Avatar } from '../core/Avatar.jsx';
import { CategoryBadge } from './CategoryBadge.jsx';

const CSS = `
.rl-threadrow{display:flex;gap:13px;padding:14px 16px;cursor:pointer;text-align:left;width:100%;
  border:none;background:transparent;border-bottom:1px solid var(--border-subtle);
  transition:background var(--duration-fast) var(--ease-standard);align-items:flex-start;font-family:var(--font-sans)}
.rl-threadrow:hover{background:var(--surface-hover)}
.rl-threadrow:focus-visible{outline:none;background:var(--surface-hover);box-shadow:inset 3px 0 0 var(--accent)}
.rl-threadrow--unread{box-shadow:inset 3px 0 0 var(--accent)}
.rl-threadrow__main{flex:1;min-width:0}
.rl-threadrow__top{display:flex;align-items:center;gap:8px}
.rl-threadrow__subj{font-size:14px;color:var(--text-strong);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;min-width:0}
.rl-threadrow--unread .rl-threadrow__subj{font-weight:700}
.rl-threadrow__count{font-family:var(--font-mono);font-size:11px;color:var(--text-muted);
  background:var(--ink-100);border-radius:var(--radius-full);padding:2px 7px;flex:none}
.rl-threadrow__date{font-family:var(--font-mono);font-size:11px;color:var(--text-subtle);flex:none}
.rl-threadrow__sender{font-size:12px;color:var(--text-muted);margin:1px 0 5px;font-weight:500}
.rl-threadrow__summary{font-size:13px;color:var(--text-muted);line-height:1.45;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.rl-threadrow__summary--pending{color:var(--text-subtle);font-style:italic}
.rl-threadrow__foot{display:flex;align-items:center;gap:8px;margin-top:8px}
`;
let injected=false;
function useStyles(){ if(!injected&&typeof document!=='undefined'){const s=document.createElement('style');s.id='rl-threadrow';s.textContent=CSS;if(!document.getElementById('rl-threadrow'))document.head.appendChild(s);injected=true;} }

export function ThreadRow({ sender, subject, summary, date, messageCount = 1, category, unread = false, onClick }) {
  useStyles();
  return (
    <button className={`rl-threadrow${unread ? ' rl-threadrow--unread' : ''}`} onClick={onClick}>
      <Avatar name={sender} size="md" />
      <div className="rl-threadrow__main">
        <div className="rl-threadrow__top">
          <span className="rl-threadrow__subj">{subject}</span>
          {messageCount > 1 && <span className="rl-threadrow__count">{messageCount}</span>}
          <span className="rl-threadrow__date">{date}</span>
        </div>
        <div className="rl-threadrow__sender">{sender}</div>
        <div className={`rl-threadrow__summary${summary ? '' : ' rl-threadrow__summary--pending'}`}>
          {summary || 'Summary pending…'}
        </div>
        <div className="rl-threadrow__foot">
          {category && <CategoryBadge category={category} size="sm" />}
        </div>
      </div>
    </button>
  );
}
