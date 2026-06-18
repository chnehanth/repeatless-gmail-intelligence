import React from 'react';
import { Icon } from './Icon.jsx';

const CSS = `
.rl-btn{
  --_bg:var(--accent); --_fg:var(--accent-fg); --_bd:transparent; --_bgh:var(--accent-hover); --_bga:var(--accent-active);
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  font-family:var(--font-sans);font-weight:600;white-space:nowrap;cursor:pointer;
  border:1px solid var(--_bd);background:var(--_bg);color:var(--_fg);
  border-radius:var(--radius-md);transition:background var(--duration-fast) var(--ease-standard),
    box-shadow var(--duration-fast) var(--ease-standard),transform var(--duration-fast) var(--ease-standard),border-color var(--duration-fast);
  -webkit-tap-highlight-color:transparent;user-select:none;text-decoration:none;
}
.rl-btn:hover{background:var(--_bgh)}
.rl-btn:active{background:var(--_bga);transform:translateY(1px)}
.rl-btn:focus-visible{outline:none;box-shadow:var(--ring)}
.rl-btn[disabled]{opacity:.5;cursor:not-allowed;transform:none}
.rl-btn--sm{height:30px;padding:0 12px;font-size:13px}
.rl-btn--md{height:38px;padding:0 16px;font-size:14px}
.rl-btn--lg{height:46px;padding:0 22px;font-size:15px}
.rl-btn--block{width:100%}
.rl-btn--secondary{--_bg:var(--surface-card);--_fg:var(--text-strong);--_bd:var(--border-default);--_bgh:var(--surface-hover);--_bga:var(--surface-active)}
.rl-btn--ghost{--_bg:transparent;--_fg:var(--text-body);--_bd:transparent;--_bgh:var(--surface-hover);--_bga:var(--surface-active)}
.rl-btn--danger{--_bg:var(--danger);--_fg:#fff;--_bgh:var(--danger-hover);--_bga:var(--danger-hover)}
.rl-btn--ai{--_bg:var(--ai);--_fg:#fff;--_bgh:var(--violet-600);--_bga:var(--violet-600)}
.rl-btn__spin{width:15px;height:15px;border-radius:50%;border:2px solid currentColor;border-right-color:transparent;animation:rl-btn-spin .6s linear infinite}
@keyframes rl-btn-spin{to{transform:rotate(360deg)}}
`;

let injected = false;
function useStyles() {
  if (!injected && typeof document !== 'undefined') {
    const s = document.createElement('style');
    s.id = 'rl-button'; s.textContent = CSS;
    if (!document.getElementById('rl-button')) document.head.appendChild(s);
    injected = true;
  }
}

export function Button({
  variant = 'primary', size = 'md', leftIcon, rightIcon, icon,
  loading = false, fullWidth = false, disabled, children, className = '', ...rest
}) {
  useStyles();
  const cls = `rl-btn rl-btn--${variant} rl-btn--${size}${fullWidth ? ' rl-btn--block' : ''} ${className}`.trim();
  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading && <span className="rl-btn__spin" />}
      {!loading && (leftIcon || icon) && <Icon name={leftIcon || icon} size={size === 'sm' ? 16 : 18} />}
      {children && <span>{children}</span>}
      {!loading && rightIcon && <Icon name={rightIcon} size={size === 'sm' ? 16 : 18} />}
    </button>
  );
}
