import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { EMAIL_CATEGORIES, type EmailCategory } from '@repeatless/shared';
import { api } from '../lib/api';
import { categoryToDs, formatDate } from '../lib/ui';
import { Button, EmptyState, Input, Skeleton, Switch, ThreadRow } from '../ds';
import { ComposeModal } from '../components/ComposeModal';

const CHIPS: ('All' | EmailCategory)[] = ['All', ...EMAIL_CATEGORIES];

export function Inbox() {
  const navigate = useNavigate();
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '22px 28px 0', flex: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <h1 style={{ font: 'var(--type-h2)', letterSpacing: '-0.02em', color: 'var(--text-strong)', margin: 0 }}>Inbox</h1>
          <Button leftIcon="sparkles" onClick={() => setComposeOpen(true)}>
            Compose with AI
          </Button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput.trim());
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '18px 0 14px' }}
        >
          <div style={{ flex: 1, maxWidth: 360 }}>
            <Input
              size="sm"
              leftIcon="search"
              placeholder="Search subjects"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Switch label="Unread only" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} />
        </form>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 14 }}>
          {CHIPS.map((c) => (
            <Chip
              key={c}
              label={c}
              active={c === 'All' ? !category : category === c}
              onClick={() => setCategory(c === 'All' ? undefined : (c as EmailCategory))}
            />
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid var(--border-subtle)' }}>
        {query.isLoading ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={54} radius={12} />
            ))}
          </div>
        ) : threads.length === 0 ? (
          <EmptyState
            icon="inbox"
            title={unreadOnly ? 'No unread threads.' : 'Nothing matches.'}
            description="Your inbox is still syncing, or nothing matches this filter."
          />
        ) : (
          <div>
            {threads.map((t) => (
              <ThreadRow
                key={t.id}
                sender={t.participants[0]?.name ?? t.participants[0]?.email ?? 'Unknown'}
                subject={t.subject || '(no subject)'}
                summary={t.summary ?? undefined}
                date={formatDate(t.lastMessageAt)}
                messageCount={t.messageCount}
                category={categoryToDs(t.category) ?? undefined}
                unread={t.isUnread}
                onClick={() => navigate(`/inbox/${t.id}`)}
              />
            ))}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '18px 0 28px' }}>
              {query.hasNextPage ? (
                <Button variant="secondary" size="sm" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
                  Load more
                </Button>
              ) : (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-subtle)' }}>
                  {threads.length} threads
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {composeOpen && <ComposeModal mode="compose" onClose={() => setComposeOpen(false)} />}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 13px',
        borderRadius: 'var(--radius-full)',
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        fontSize: 13,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        border: '1px solid ' + (active ? 'transparent' : 'var(--border-default)'),
        background: active ? 'var(--accent)' : 'var(--surface-card)',
        color: active ? '#fff' : 'var(--text-body)',
      }}
    >
      {label}
    </button>
  );
}
