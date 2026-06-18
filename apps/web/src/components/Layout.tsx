import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { UserProfile } from '@repeatless/shared';
import { api } from '../lib/api';
import { Avatar, Icon, SyncIndicator, wordmarkInverse, type IconName } from '../ds';

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: '/inbox', label: 'Inbox', icon: 'inbox' },
  { to: '/chat', label: 'Ask AI', icon: 'sparkles' },
  { to: '/news', label: 'News digest', icon: 'newspaper' },
];

type SyncStatus = 'synced' | 'syncing' | 'error';

function mapSyncStatus(status: string | undefined): SyncStatus {
  if (status === 'error') return 'error';
  if (status === 'initial' || status === 'incremental') return 'syncing';
  return 'synced';
}

/** Dark app shell: brand wordmark, nav, live sync indicator, user footer. */
export function Layout({ user }: { user: UserProfile }) {
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();

  const sync = useQuery({
    queryKey: ['syncStatus'],
    queryFn: api.syncStatus,
    refetchInterval: (q) => (mapSyncStatus(q.state.data?.status) === 'syncing' ? 5_000 : 30_000),
  });

  const triggerSync = useMutation({
    mutationFn: () => api.triggerSync('incremental'),
    onSuccess: () => setTimeout(() => qc.invalidateQueries({ queryKey: ['syncStatus'] }), 1500),
  });

  const logout = useMutation({
    mutationFn: api.logout,
    onSuccess: () => {
      qc.clear();
      navigate('/');
      window.location.reload();
    },
  });

  const status = mapSyncStatus(sync.data?.status);
  const inThread = location.pathname.startsWith('/inbox');

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--surface-page)' }}>
      <aside
        style={{
          width: 'var(--sidebar-width)',
          flex: 'none',
          background: 'var(--ink-900)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '18px 14px',
        }}
      >
        <div style={{ padding: '4px 8px 22px' }}>
          <img src={wordmarkInverse} alt="Repeatless" style={{ height: 26 }} />
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {NAV.map((item) => {
            const active = item.to === '/inbox' ? inThread : location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 14,
                  fontWeight: active ? 600 : 500,
                  color: active ? '#fff' : 'rgba(255,255,255,0.66)',
                  background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
                }}
              >
                <Icon name={item.icon} size={19} color={active ? 'var(--blue-300)' : 'currentColor'} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />

        <div style={{ marginBottom: 14 }}>
          <SyncIndicator
            status={status}
            threadCount={sync.data?.threadCount}
            messageCount={sync.data?.totalMessages}
            error={sync.data?.lastError ?? undefined}
            onRefresh={() => triggerSync.mutate()}
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 8px 4px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Avatar name={user.displayName ?? user.email} size="sm" />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user.displayName ?? user.email}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'rgba(255,255,255,0.45)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user.email}
            </div>
          </div>
          <button
            onClick={() => logout.mutate()}
            aria-label="Sign out"
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)',
              padding: 4,
              display: 'inline-flex',
              borderRadius: 6,
            }}
          >
            <Icon name="logout" size={17} />
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}>
        <Outlet />
      </main>
    </div>
  );
}
