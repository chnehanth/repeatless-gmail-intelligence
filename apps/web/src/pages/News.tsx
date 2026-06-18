import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { NewsItem } from '@repeatless/shared';
import { api } from '../lib/api';
import { Badge, EmptyState, Skeleton, ToneSelector } from '../ds';

const WINDOWS: Record<string, number> = {
  '1 day': 1,
  '2 days': 2,
  '4 days': 4,
  '7 days': 7,
  '14 days': 14,
};

export function News() {
  const [win, setWin] = useState('4 days');
  const days = WINDOWS[win] ?? 4;

  const { data, isLoading, isFetching, isError } = useQuery({
    queryKey: ['news', days],
    queryFn: () => api.newsDigest(days),
  });

  const stories = data?.items ?? [];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '22px 28px 16px', flex: 'none', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ font: 'var(--type-h2)', letterSpacing: '-0.02em', color: 'var(--text-strong)', margin: 0 }}>News digest</h1>
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Newsletters, deduplicated into the stories that matter.
            </p>
          </div>
          <ToneSelector options={Object.keys(WINDOWS)} value={win} onChange={setWin} />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '22px 28px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isLoading || isFetching ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={120} radius={16} />)
          ) : isError ? (
            <p style={{ font: 'var(--type-body)', color: 'var(--danger)' }}>Couldn&apos;t build the digest.</p>
          ) : stories.length === 0 ? (
            <EmptyState
              icon="newspaper"
              title="No stories yet."
              description="No newsletter stories in this window. Make sure your inbox has synced."
            />
          ) : (
            stories.map((story, i) => <StoryCard key={i} story={story} />)
          )}
        </div>
      </div>
    </div>
  );
}

function StoryCard({ story }: { story: NewsItem }) {
  return (
    <div
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-xs)',
        padding: 18,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
        <h3 style={{ font: 'var(--type-h4)', letterSpacing: '-0.01em', color: 'var(--text-strong)', margin: '0 0 6px' }}>{story.title}</h3>
        {story.sources.length > 1 && (
          <Badge variant="blue" size="sm">
            {story.sources.length} sources
          </Badge>
        )}
      </div>
      <p style={{ font: 'var(--type-body)', color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.55 }}>{story.summary}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {story.sources.map((s, j) => (
          <span
            key={j}
            title={s.subject ?? ''}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 9px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--surface-sunken)',
              border: '1px solid var(--border-subtle)',
              fontFamily: 'var(--font-sans)',
              fontSize: 12,
              color: 'var(--text-muted)',
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-subtle)' }} />
            {s.sender ?? 'source'}
          </span>
        ))}
      </div>
    </div>
  );
}
