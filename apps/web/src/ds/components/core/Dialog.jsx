import React from 'react';
import { IconButton } from './IconButton.jsx';

const CSS = `
.rl-dialog__scrim{position:fixed;inset:0;background:rgba(14,22,38,.45);backdrop-filter:blur(2px);
  display:flex;align-items:center;justify-content:center;padding:24px;z-index:1000;
  animation:rl-dlg-fade var(--duration-base) var(--ease-standard)}
.rl-dialog{background:var(--surface-card);border-radius:var(--radius-2xl);box-shadow:var(--shadow-xl);
  width:100%;max-width:520px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;
  animation:rl-dlg-rise var(--duration-base) var(--ease-out)}
.rl-dialog__head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;
  padding:20px 20px 14px}
.rl-dialog__title{font-family:var(--font-sans);font-size:18px;font-weight:600;color:var(--text-strong);margin:0}
.rl-dialog__sub{font-family:var(--font-sans);font-size:13px;color:var(--text-muted);margin:3px 0 0}
.rl-dialog__body{padding:0 20px 20px;overflow:auto}
.rl-dialog__foot{display:flex;justify-content:flex-end;gap:10px;padding:14px 20px;
  border-top:1px solid var(--border-subtle);background:var(--surface-card)}
@keyframes rl-dlg-fade{from{opacity:0}to{opacity:1}}
@keyframes rl-dlg-rise{from{opacity:0;transform:translateY(8px) scale(.99)}to{opacity:1;transform:none}}
`;
let injected=false;
function useStyles(){ if(!injected&&typeof document!=='undefined'){const s=document.createElement('style');s.id='rl-dialog';s.textContent=CSS;if(!document.getElementById('rl-dialog'))document.head.appendChild(s);injected=true;} }

export function Dialog({ open = true, onClose, title, subtitle, footer, width, children }) {
  useStyles();
  if (!open) return null;
  return (
    <div className="rl-dialog__scrim" onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}>
      <div className="rl-dialog" style={width ? { maxWidth: width } : undefined} role="dialog" aria-modal="true">
        {(title || onClose) && (
          <div className="rl-dialog__head">
            <div>
              {title && <h2 className="rl-dialog__title">{title}</h2>}
              {subtitle && <p className="rl-dialog__sub">{subtitle}</p>}
            </div>
            {onClose && <IconButton icon="x" label="Close" size="sm" onClick={onClose} />}
          </div>
        )}
        <div className="rl-dialog__body">{children}</div>
        {footer && <div className="rl-dialog__foot">{footer}</div>}
      </div>
    </div>
  );
}
