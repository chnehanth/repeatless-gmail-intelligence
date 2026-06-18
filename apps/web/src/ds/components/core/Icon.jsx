import React from 'react';

/**
 * Repeatless icon set — a curated subset of Lucide (https://lucide.dev),
 * the brand's chosen icon system: clean 2px-stroke geometric icons.
 * Path data is copied verbatim from Lucide (ISC license).
 */
const PATHS = {
  search: ['<circle cx="11" cy="11" r="8"/>', '<path d="m21 21-4.3-4.3"/>'],
  sparkles: [
    '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z"/>',
    '<path d="M20 3v4"/>', '<path d="M22 5h-4"/>', '<path d="M4 17v2"/>', '<path d="M5 18H3"/>',
  ],
  send: [
    '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/>',
    '<path d="m21.854 2.147-10.94 10.939"/>',
  ],
  inbox: [
    '<path d="M22 12h-6l-2 3h-4l-2-3H2"/>',
    '<path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  ],
  refresh: ['<path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>', '<path d="M21 3v5h-5"/>'],
  chevronRight: ['<path d="m9 18 6-6-6-6"/>'],
  chevronDown: ['<path d="m6 9 6 6 6-6"/>'],
  x: ['<path d="M18 6 6 18"/>', '<path d="m6 6 12 12"/>'],
  check: ['<path d="M20 6 9 17l-5-5"/>'],
  newspaper: [
    '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>',
    '<path d="M18 14h-8"/>', '<path d="M15 18h-5"/>', '<path d="M10 6h8v4h-8V6Z"/>',
  ],
  mail: ['<rect width="20" height="16" x="2" y="4" rx="2"/>', '<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>'],
  user: ['<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>', '<circle cx="12" cy="7" r="4"/>'],
  logout: ['<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>', '<polyline points="16 17 21 12 16 7"/>', '<line x1="21" x2="9" y1="12" y2="12"/>'],
  pencil: ['<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>', '<path d="m15 5 4 4"/>'],
  arrowUp: ['<path d="m5 12 7-7 7 7"/>', '<path d="M12 19V5"/>'],
  clock: ['<circle cx="12" cy="12" r="10"/>', '<polyline points="12 6 12 12 16 14"/>'],
  filter: ['<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>'],
};

export function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 2, style, ...rest }) {
  const inner = PATHS[name] || [];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'block', flex: 'none', ...style }}
      dangerouslySetInnerHTML={{ __html: inner.join('') }}
      {...rest}
    />
  );
}
