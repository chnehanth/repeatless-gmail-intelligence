import type { EmailCategory } from '@repeatless/shared';

/**
 * Synthetic but realistic inbox used by the "Explore the demo" mode. Crafted to
 * exercise every feature: multiple job rejections + an interview + an offer
 * (so "which companies rejected me?" works), a finance invoice, a multi-message
 * work project thread (so "what's the status of the data migration?" works),
 * overlapping newsletter stories (so dedup merges them), notifications, etc.
 *
 * Dates are mid-June 2026 so the news digest's recency window includes them.
 */
export interface DemoMessage {
  from: { name: string; email: string };
  date: string; // ISO
  body: string;
}
export interface DemoThread {
  gmailThreadId: string;
  subject: string;
  category: EmailCategory;
  summary: string;
  unread?: boolean;
  messages: DemoMessage[];
}

const me = { name: 'Demo User', email: 'demo@repeatless.app' };

export const DEMO_THREADS: DemoThread[] = [
  {
    gmailThreadId: 'demo-acme-reject',
    subject: 'Update on your application — Senior Engineer',
    category: 'Job/Recruitment',
    summary: 'Acme Corp declined the candidate for the Senior Engineer role after the final round, citing a stronger-fit candidate; they invited future applications.',
    messages: [
      {
        from: { name: 'Acme Corp Recruiting', email: 'talent@acmecorp.com' },
        date: '2026-06-16T09:12:00Z',
        body: 'Hi,\n\nThank you for interviewing for the Senior Engineer position at Acme Corp. After careful consideration, we have decided to move forward with another candidate whose background more closely matched the role at this time.\n\nWe were impressed with your system-design discussion and encourage you to apply for future openings.\n\nBest regards,\nThe Acme Corp Talent Team',
      },
    ],
  },
  {
    gmailThreadId: 'demo-globex-reject',
    subject: 'Your Globex application',
    category: 'Job/Recruitment',
    summary: 'Globex Inc rejected the application for the Backend Developer role; they will keep the resume on file for six months.',
    messages: [
      {
        from: { name: 'Globex Careers', email: 'no-reply@globex.io' },
        date: '2026-06-14T15:40:00Z',
        body: 'Dear Applicant,\n\nWe appreciate your interest in the Backend Developer role at Globex Inc. Unfortunately we will not be proceeding with your application at this stage. We will keep your details on file for six months should a suitable role arise.\n\nThank you,\nGlobex Talent Acquisition',
      },
    ],
  },
  {
    gmailThreadId: 'demo-initech-interview',
    subject: 'Interview invitation — Platform Engineer @ Initech',
    category: 'Job/Recruitment',
    unread: true,
    summary: 'Initech invited the candidate to a 45-minute technical interview for the Platform Engineer role and asked for availability next week.',
    messages: [
      {
        from: { name: 'Priya Nair (Initech)', email: 'priya.nair@initech.com' },
        date: '2026-06-18T11:05:00Z',
        body: "Hello,\n\nWe'd love to invite you to a 45-minute technical interview for the Platform Engineer role at Initech. The session covers distributed systems and a short coding exercise.\n\nCould you share two or three time slots that work for you next week? We can do mornings IST.\n\nLooking forward,\nPriya",
      },
    ],
  },
  {
    gmailThreadId: 'demo-hooli-offer',
    subject: 'Offer — Software Engineer II at Hooli',
    category: 'Job/Recruitment',
    unread: true,
    summary: 'Hooli extended a Software Engineer II offer at ₹28 LPA fixed plus equity; the written offer is attached and they ask for a decision within a week.',
    messages: [
      {
        from: { name: 'Hooli People Team', email: 'offers@hooli.com' },
        date: '2026-06-17T18:20:00Z',
        body: "Congratulations!\n\nWe're delighted to offer you the Software Engineer II position at Hooli. The compensation is ₹28,00,000 fixed per annum plus equity and standard benefits. The formal offer letter is attached.\n\nPlease let us know your decision within one week. We're excited about the possibility of you joining.\n\nWarm regards,\nHooli People Team",
      },
    ],
  },
  {
    gmailThreadId: 'demo-stripe-invoice',
    subject: 'Your invoice from Stripe is available',
    category: 'Finance',
    summary: 'Stripe issued invoice #INV-2042 for $49.00 for the monthly Pro plan; payment was auto-charged to the card ending 4242.',
    messages: [
      {
        from: { name: 'Stripe', email: 'invoice+statements@stripe.com' },
        date: '2026-06-15T06:00:00Z',
        body: 'Invoice #INV-2042\n\nAmount due: $49.00 USD — Pro plan (monthly)\nStatus: Paid\nWe automatically charged your Visa ending in 4242 on June 15, 2026.\n\nYou can download a PDF receipt from your billing dashboard.\n\nThanks for your business,\nStripe',
      },
    ],
  },
  {
    gmailThreadId: 'demo-bank-alert',
    subject: 'Transaction alert: ₹3,499 debited',
    category: 'Finance',
    summary: 'HDFC Bank flagged a ₹3,499 debit at an online merchant and asked the user to report it if unrecognized.',
    messages: [
      {
        from: { name: 'HDFC Bank Alerts', email: 'alerts@hdfcbank.net' },
        date: '2026-06-18T08:30:00Z',
        body: 'Dear Customer,\n\nINR 3,499.00 was debited from your account ending 8821 on 18-Jun-2026 towards an online purchase. If you did not authorise this transaction, please report it immediately via the app.\n\nDo not share your OTP or PIN with anyone.\n\nHDFC Bank',
      },
    ],
  },
  {
    gmailThreadId: 'demo-tldr-news',
    subject: 'TLDR: OpenAI ships new model, Kubernetes 1.31, and more',
    category: 'Newsletters',
    summary: 'TLDR newsletter covering a major new AI model release, the Kubernetes 1.31 launch with improved autoscaling, and a large Series B funding round.',
    messages: [
      {
        from: { name: 'TLDR Newsletter', email: 'dan@tldrnewsletter.com' },
        date: '2026-06-17T07:30:00Z',
        body: "Today's stories:\n\n1. A major AI lab released a new flagship model with a 1M-token context window and lower pricing, intensifying the model price war.\n\n2. Kubernetes 1.31 is out, featuring smarter pod autoscaling and reduced control-plane memory usage.\n\n3. DevTooling startup Flowbit raised a $40M Series B led by Accel to expand its CI platform.\n\nThat's all for today!",
      },
    ],
  },
  {
    gmailThreadId: 'demo-bytebyte-news',
    subject: 'ByteByteGo Weekly: Kubernetes 1.31 + the AI model price war',
    category: 'Newsletters',
    summary: 'ByteByteGo weekly digest covering the new flagship AI model price cuts and the Kubernetes 1.31 release, plus a system-design deep dive.',
    messages: [
      {
        from: { name: 'ByteByteGo', email: 'hello@bytebytego.com' },
        date: '2026-06-18T07:00:00Z',
        body: 'This week:\n\n• The new flagship AI model with a 1M-token context window is making headlines — competitors are expected to cut prices in response.\n\n• Kubernetes 1.31 landed with improved autoscaling; we break down what changed in the scheduler.\n\n• Deep dive: designing an idempotent payment system.\n\nHappy reading!',
      },
    ],
  },
  {
    gmailThreadId: 'demo-migration-project',
    subject: 'Data migration project — cutover plan',
    category: 'Work/Professional',
    unread: true,
    summary: 'The team is planning the production data migration: Sara proposed a Saturday cutover with a read-only window, Marco raised a rollback concern, and the team agreed to a dry run on staging first.',
    messages: [
      {
        from: { name: 'Sara Lopez', email: 'sara.lopez@company.com' },
        date: '2026-06-16T10:00:00Z',
        body: 'Team,\n\nFor the data migration, I propose we do the production cutover this Saturday 2am–6am IST with a read-only window for users. I will prepare the migration scripts and the verification checklist.\n\nThoughts?',
      },
      {
        from: { name: 'Marco Bianchi', email: 'marco.bianchi@company.com' },
        date: '2026-06-16T12:30:00Z',
        body: "Sounds reasonable, but I'm worried about rollback if row counts don't reconcile. Can we agree on a hard rollback trigger and a tested restore path before we commit to the window?",
      },
      {
        from: { name: 'Sara Lopez', email: 'sara.lopez@company.com' },
        date: '2026-06-17T09:15:00Z',
        body: "Good call. Let's do a full dry run on staging Thursday, capture timings and row-count checks, and only confirm the Saturday window if the dry run reconciles cleanly. I'll add a rollback trigger if any table diff exceeds 0.1%.",
      },
    ],
  },
  {
    gmailThreadId: 'demo-vendor-datadog',
    subject: 'Datadog renewal & pricing for next year',
    category: 'Work/Professional',
    summary: 'Datadog account manager shared the renewal quote: a 12% increase, with a discount available for a two-year commitment; they asked to schedule a call.',
    messages: [
      {
        from: { name: 'Datadog Account Team', email: 'sales@datadoghq.com' },
        date: '2026-06-13T14:00:00Z',
        body: 'Hi,\n\nYour Datadog subscription renews next month. The renewal quote reflects a 12% increase due to expanded host usage. We can offer a 15% discount if you commit to a two-year term.\n\nWould you have time for a 20-minute call this week to walk through options?\n\nBest,\nDatadog',
      },
    ],
  },
  {
    gmailThreadId: 'demo-otp',
    subject: 'Your verification code is 481920',
    category: 'Notifications',
    summary: 'A one-time login verification code (481920) valid for 10 minutes.',
    messages: [
      {
        from: { name: 'GitHub', email: 'noreply@github.com' },
        date: '2026-06-19T05:02:00Z',
        body: 'Your GitHub one-time verification code is 481920. It expires in 10 minutes. If you did not request this, please secure your account and reset your password.',
      },
    ],
  },
  {
    gmailThreadId: 'demo-security-alert',
    subject: 'New sign-in to your account',
    category: 'Notifications',
    summary: 'Google reported a new sign-in from a Chrome browser on Windows in Bengaluru; asked the user to verify it was them.',
    messages: [
      {
        from: { name: 'Google', email: 'no-reply@accounts.google.com' },
        date: '2026-06-18T22:10:00Z',
        body: 'We noticed a new sign-in to your Google Account on a Windows device using Chrome, near Bengaluru, India. If this was you, no action is needed. If not, review your account activity and secure your account.',
      },
    ],
  },
  {
    gmailThreadId: 'demo-personal',
    subject: 'Trek plan for next month 🏔️',
    category: 'Personal',
    summary: 'A friend (Rahul) proposed a weekend trek to Kudremukh next month and asked the user to confirm dates and whether to book the homestay.',
    messages: [
      {
        from: { name: 'Rahul Verma', email: 'rahul.verma@gmail.com' },
        date: '2026-06-15T19:45:00Z',
        body: "Hey!\n\nThinking of doing the Kudremukh trek the second weekend of next month. The weather should be great post-monsoon. Are you in? If yes I'll book the homestay for Friday and Saturday night before they fill up.\n\nLet me know by this weekend!\nRahul",
      },
    ],
  },
  {
    gmailThreadId: 'demo-promo',
    subject: '⚡ 48-hour sale: 40% off annual plans',
    category: 'Promotions',
    summary: 'Notion is running a 48-hour promotion offering 40% off annual plans with code SAVE40.',
    messages: [
      {
        from: { name: 'Notion', email: 'team@mail.notion.so' },
        date: '2026-06-17T13:00:00Z',
        body: 'For the next 48 hours only, get 40% off any annual Notion plan with code SAVE40 at checkout. Upgrade your workspace and save. Offer ends Thursday at midnight PT.',
      },
    ],
  },
];

export const DEMO_ME = me;
