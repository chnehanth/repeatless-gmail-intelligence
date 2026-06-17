/**
 * Canonical email category taxonomy.
 *
 * The spec mandates the first six categories. We add `Promotions` and a
 * fallback `Other` because real inboxes contain marketing mail that is neither
 * a subscription "Newsletter" nor a transactional "Notification", and a
 * catch-all prevents the classifier from being forced into a wrong bucket
 * (which would hurt downstream filtering and the chat agent's precision).
 * This decision is documented in Architecture.md.
 */
export const EMAIL_CATEGORIES = [
  'Newsletters',
  'Job/Recruitment',
  'Finance',
  'Notifications',
  'Personal',
  'Work/Professional',
  'Promotions',
  'Other',
] as const;

export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];

export const DEFAULT_CATEGORY: EmailCategory = 'Other';

export function isEmailCategory(value: unknown): value is EmailCategory {
  return typeof value === 'string' && (EMAIL_CATEGORIES as readonly string[]).includes(value);
}

/** Human-friendly descriptions, also injected into the classifier prompt. */
export const CATEGORY_DESCRIPTIONS: Record<EmailCategory, string> = {
  Newsletters: 'Subscription-based content, digests, and recurring publications.',
  'Job/Recruitment': 'Applications, offers, rejections, interview requests, recruiter outreach.',
  Finance: 'Invoices, receipts, bank alerts, payments, statements.',
  Notifications: 'System alerts, OTPs, security codes, platform/status updates.',
  Personal: 'Direct human-to-human communication between known individuals.',
  'Work/Professional': 'Project discussions, team communication, business correspondence.',
  Promotions: 'Marketing, sales, and promotional offers that are not subscriptions.',
  Other: 'Does not clearly fit any other category.',
};
