import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { EMAIL_CATEGORIES, type EmailCategory } from '@repeatless/shared';
import { api } from '../lib/api';
import { categoryClass, formatDate, initials } from '../lib/ui';
import { ComposeModal } from '../components/ComposeModal';

export function Inbox() {
  const [category, setCategory] = useState<EmailCategory | undefined>();
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);

  const query = useInfiniteQuery({
    queryKey: ['threads', { category, search, unreadOnly }],
    queryFn: ({ pageParam }) =>
      api.listThreads({ cursor: pageParam, category, search: search || undefined, unreadOnly }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const threads = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Inbox</h1>
        <button
          onClick={() => setComposeOpen(true)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          ✏️ Compose with AI
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(searchInput.trim());
        }}
        className="mb-3 flex gap-2"
      >
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search subjects…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
          Unread
        </label>
      </form>

      <div className="mb-4 flex flex-wrap gap-2">
        <Chip active={!category} onClick={() => setCategory(undefined)} label="All" />
        {EMAIL_CATEGORIES.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)} label={c} />
        ))}
      </div>

      {query.isLoading ? (
        <SkeletonList />
      ) : threads.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          {threads.map((t) => (
            <li key={t.id}>
              <Link to={`/inbox/${t.id}`} className="block px-4 py-3 transition hover:bg-slate-50">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                    {initials(t.participants[0]?.name ?? null, t.participants[0]?.email ?? '?')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`truncate text-sm ${t.isUnread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {t.subject || '(no subject)'}
                      </span>
                      {t.messageCount > 1 && (
                        <span className="flex-none rounded bg-slate-100 px-1.5 text-xs text-slate-500">{t.messageCount}</span>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{t.summary ?? 'Summary pending…'}</p>
                  </div>
                  <div className="flex flex-none flex-col items-end gap-1.5">
                    <span className="text-xs text-slate-400">{formatDate(t.lastMessageAt)}</span>
                    {t.category && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${categoryClass(t.category)}`}>
                        {t.category}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {query.hasNextPage && (
        <div className="mt-4 text-center">
          <button
            onClick={() => query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}

      {composeOpen && <ComposeModal onClose={() => setComposeOpen(false)} />}
    </div>
  );
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        active ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-white ring-1 ring-slate-100" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl bg-white p-12 text-center ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">No threads yet. Your inbox is still syncing, or no emails match this filter.</p>
    </div>
  );
}
