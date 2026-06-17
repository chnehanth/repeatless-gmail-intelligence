import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import type { UserProfile } from '@repeatless/shared';
import { api } from '../lib/api';

const NAV = [
  { to: '/inbox', label: 'Inbox', icon: '📥' },
  { to: '/chat', label: 'Ask AI', icon: '💬' },
  { to: '/news', label: 'News Digest', icon: '📰' },
];

export function Layout({ user }: { user: UserProfile }) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const sync = useQuery({
    queryKey: ['syncStatus'],
    queryFn: api.syncStatus,
    refetchInterval: (q) => (q.state.data?.status === 'idle' ? 30_000 : 5_000),
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

  const status = sync.data?.status ?? 'idle';
  const busy = status === 'initial' || status === 'incremental';

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="flex items-center gap-2 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">R</div>
          <span className="font-semibold text-slate-900">Repeatless</span>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 px-3 py-3 text-xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className={`h-2 w-2 rounded-full ${busy ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'}`} />
              {busy ? 'Syncing…' : 'Synced'}
            </span>
            <button
              onClick={() => triggerSync.mutate()}
              disabled={busy}
              className="rounded px-2 py-1 text-brand-600 hover:bg-brand-50 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
          <p className="text-slate-400">
            {sync.data ? `${sync.data.threadCount} threads · ${sync.data.totalMessages} msgs` : '—'}
          </p>
          {sync.data?.lastError && <p className="mt-1 truncate text-red-500" title={sync.data.lastError}>⚠ {sync.data.lastError}</p>}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-700">{user.displayName ?? user.email}</p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>
          <button onClick={() => logout.mutate()} className="text-xs text-slate-400 hover:text-red-500">
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-slate-50">
        <Outlet />
      </main>
    </div>
  );
}
