import React from 'react';
import { Icon } from './Icon.jsx';

export function EmptyState({ icon = 'inbox', title, description, action, style, ...rest }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      gap: 6, padding: '48px 24px', fontFamily: 'var(--font-sans)', ...style,
    }} {...rest}>
      <div style={{
        width: 52, height: 52, borderRadius: 'var(--radius-xl)', background: 'var(--surface-sunken)',
        border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: 'var(--text-subtle)', marginBottom: 6,
      }}>
        <Icon name={icon} size={24} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-strong)' }}>{title}</div>
      {description && <div style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 320, lineHeight: 1.5 }}>{description}</div>}
      {action && <div style={{ marginTop: 10 }}>{action}</div>}
    </div>
  );
}
