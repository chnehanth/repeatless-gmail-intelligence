import type { EmailCategory } from '@repeatless/shared';

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / 3_600_000;
  if (diffH < 1) return `${Math.max(1, Math.floor(diffMs / 60_000))}m`;
  if (diffH < 24 && d.toDateString() === now.toDateString()) return `${Math.floor(diffH)}h`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Map our backend taxonomy onto the design system's CategoryBadge keys.
 * The DS badge colors + capitalizes the value it's given, so we pass the DS
 * key (e.g. "work") and it renders the branded color pair + label.
 */
const CATEGORY_TO_DS: Record<EmailCategory, string> = {
  Newsletters: 'newsletter',
  'Job/Recruitment': 'job',
  Finance: 'finance',
  Notifications: 'updates',
  Personal: 'personal',
  'Work/Professional': 'work',
  Promotions: 'promotions',
  Other: 'updates',
};

export function categoryToDs(category: EmailCategory | null): string | null {
  if (!category) return null;
  return CATEGORY_TO_DS[category] ?? 'updates';
}
