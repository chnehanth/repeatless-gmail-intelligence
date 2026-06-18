import React from 'react';

const TINTS = [
  ['#EEF3FF', '#1E54E0'], ['#FDF0F6', '#C03083'], ['#ECFDF3', '#0E6E32'],
  ['#EAF8FB', '#0E7490'], ['#FFF4EC', '#C2570A'], ['#F1F0FE', '#6442E8'],
  ['#FFF8EB', '#B86E00'], ['#EEF1F6', '#3C4860'],
];

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function hash(str = '') { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0; return Math.abs(h); }

const SIZES = { xs: 24, sm: 32, md: 40, lg: 48 };

export function Avatar({ name = '', src, size = 'md', square = false, style, ...rest }) {
  const px = SIZES[size] || size;
  const [bg, fg] = TINTS[hash(name) % TINTS.length];
  const base = {
    width: px, height: px, borderRadius: square ? 'var(--radius-md)' : '50%',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    flex: 'none', overflow: 'hidden', fontFamily: 'var(--font-sans)',
    fontWeight: 600, fontSize: Math.round(px * 0.4), background: bg, color: fg,
    letterSpacing: '-0.01em', userSelect: 'none', ...style,
  };
  return (
    <span style={base} {...rest}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials(name)}
    </span>
  );
}
