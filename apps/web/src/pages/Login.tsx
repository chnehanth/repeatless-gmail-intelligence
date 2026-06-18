import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { wordmark } from '../ds';

/** Branded sign-in screen (design-system styling), wired to the real OAuth
 * start endpoint. Surfaces an auth error passed back via ?auth_error=. */
export function Login() {
  const params = new URLSearchParams(window.location.search);
  const authError = params.get('auth_error');

  const config = useQuery({ queryKey: ['authConfig'], queryFn: api.authConfig, retry: 0 });
  const demo = useMutation({
    mutationFn: api.demoLogin,
    onSuccess: () => {
      window.location.href = '/inbox';
    },
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface-page)',
        padding: 24,
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 26 }}>
          <img src={wordmark} alt="Repeatless" style={{ height: 30 }} />
        </div>

        <div
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-2xl)',
            boxShadow: 'var(--shadow-lg)',
            padding: 32,
          }}
        >
          <h1 style={{ font: 'var(--type-h3)', color: 'var(--text-strong)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
            Sign in to Repeatless
          </h1>
          <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: '0 0 24px' }}>
            An inbox that reads, summarizes, and answers for you.
          </p>

          {authError && (
            <div
              style={{
                background: 'var(--danger-soft)',
                border: '1px solid var(--red-100)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 12px',
                marginBottom: 16,
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: 'var(--red-600)',
              }}
            >
              Couldn&apos;t sign in: {authError}. Please try again.
            </div>
          )}

          <a
            href={api.loginUrl}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              width: '100%',
              height: 46,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              background: 'var(--surface-card)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--text-strong)',
              textDecoration: 'none',
            }}
          >
            <GoogleG /> Continue with Google
          </a>

          {config.data?.demoEnabled && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '16px 0' }}>
                <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-subtle)' }}>or</span>
                <span style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
              </div>
              <button
                onClick={() => demo.mutate()}
                disabled={demo.isPending}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  height: 46,
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: 'var(--accent)',
                  color: '#fff',
                  cursor: demo.isPending ? 'wait' : 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                {demo.isPending ? 'Loading demo…' : '✨ Explore the demo — no sign-in'}
              </button>
              <p
                style={{
                  margin: '8px 0 0',
                  textAlign: 'center',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 12,
                  color: 'var(--text-subtle)',
                }}
              >
                A populated sample inbox with working AI summaries, categories &amp; chat.
              </p>
              {demo.isError && (
                <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: 12, color: 'var(--danger)' }}>
                  Couldn&apos;t start the demo. Please try again.
                </p>
              )}
            </>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              marginTop: 18,
              justifyContent: 'center',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              color: 'var(--text-subtle)',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Your tokens are encrypted at rest.
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flex: 'none' }} aria-hidden>
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 9.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 3.18 29.93 1 24 1 15.4 1 7.96 5.93 4.34 13.12l7.35 5.7C13.42 13.62 18.27 9.75 24 9.75z" />
    </svg>
  );
}
