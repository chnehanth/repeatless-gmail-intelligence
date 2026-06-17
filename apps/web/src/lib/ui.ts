import type { EmailCategory } from '@repeatless/shared';

export function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Tailwind classes per category badge. */
export const CATEGORY_STYLES: Record<string, string> = {
  Newsletters: 'bg-amber-100 text-amber-800',
  'Job/Recruitment': 'bg-emerald-100 text-emerald-800',
  Finance: 'bg-green-100 text-green-800',
  Notifications: 'bg-sky-100 text-sky-800',
  Personal: 'bg-pink-100 text-pink-800',
  'Work/Professional': 'bg-indigo-100 text-indigo-800',
  Promotions: 'bg-orange-100 text-orange-800',
  Other: 'bg-slate-100 text-slate-700',
};

export function categoryClass(category: EmailCategory | null): string {
  return CATEGORY_STYLES[category ?? 'Other'] ?? CATEGORY_STYLES.Other!;
}

export function initials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}
