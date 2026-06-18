import React from 'react';

const CSS = `
.rl-skel{display:block;background:linear-gradient(90deg,var(--ink-100) 25%,var(--ink-50) 37%,var(--ink-100) 63%);
  background-size:400% 100%;animation:rl-shimmer 1.4s ease infinite;border-radius:var(--radius-sm)}
.rl-skel--circle{border-radius:50%}
@keyframes rl-shimmer{0%{background-position:100% 0}100%{background-position:0 0}}
@media (prefers-reduced-motion:reduce){.rl-skel{animation:none}}
`;
let injected=false;
function useStyles(){ if(!injected&&typeof document!=='undefined'){const s=document.createElement('style');s.id='rl-skel';s.textContent=CSS;if(!document.getElementById('rl-skel'))document.head.appendChild(s);injected=true;} }

export function Skeleton({ width = '100%', height = 14, circle = false, radius, style, className = '', ...rest }) {
  useStyles();
  return (
    <span
      className={`rl-skel${circle ? ' rl-skel--circle' : ''} ${className}`.trim()}
      style={{ width, height: circle ? width : height, borderRadius: radius, ...style }}
      {...rest}
    />
  );
}
