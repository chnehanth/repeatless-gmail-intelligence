import { api } from '../lib/api';

export function Login() {
  const params = new URLSearchParams(window.location.search);
  const authError = params.get('auth_error');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-white p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-100">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            R
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Repeatless</h1>
            <p className="text-sm text-slate-500">Gmail Intelligence Platform</p>
          </div>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-slate-600">
          Connect your Gmail to get AI summaries, automatic categorization, thread-aware replies, and a chat
          assistant that answers questions across your inbox — always with sources.
        </p>

        {authError && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Sign-in failed: {authError}. Please try again.
          </div>
        )}

        <a
          href={api.loginUrl}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
            <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
          </svg>
          Continue with Google
        </a>

        <p className="mt-4 text-center text-xs text-slate-400">
          We request read &amp; send access to power the assistant. Tokens are encrypted at rest.
        </p>
      </div>
    </div>
  );
}
