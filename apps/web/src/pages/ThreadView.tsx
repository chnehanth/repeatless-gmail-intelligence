import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import type { EmailMessage, EmailThread } from '@repeatless/shared';
import { api } from '../lib/api';
import { categoryToDs, formatDateTime } from '../lib/ui';
import { Avatar, Button, Card, CategoryBadge, Icon, Skeleton } from '../ds';
import { ComposeModal } from '../components/ComposeModal';

type ThreadWithMessages = EmailThread & { messages: EmailMessage[] };

export function ThreadView() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const [replyOpen, setReplyOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['thread', threadId],
    queryFn: () => api.getThread(threadId!) as Promise<ThreadWithMessages>,
    enabled: Boolean(threadId),
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '20px 28px 120px' }}>
          <button
            onClick={() => navigate('/inbox')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-sans)',
              fontSize: 13,
              fontWeight: 500,
              padding: '2px 0',
              marginBottom: 14,
            }}
          >
            <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
              <Icon name="chevronRight" size={16} />
            </span>
            Inbox
          </button>

          {isLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Skeleton height={28} width="60%" />
              <Skeleton height={88} radius={16} />
              <Skeleton height={120} radius={16} />
            </div>
          ) : isError || !data ? (
            <p style={{ font: 'var(--type-body)', color: 'var(--danger)' }}>Couldn&apos;t load this thread.</p>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <h1 style={{ font: 'var(--type-h3)', letterSpacing: '-0.02em', color: 'var(--text-strong)', margin: 0, flex: 1 }}>
                  {data.subject || '(no subject)'}
                </h1>
                {data.category && <CategoryBadge category={categoryToDs(data.category)!} />}
              </div>

              {data.summary && (
                <Card tone="ai" style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', gap: 11 }}>
                    <span style={{ flex: 'none', marginTop: 1 }}>
                      <Icon name="sparkles" size={18} color="var(--ai)" />
                    </span>
                    <div>
                      <div
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          textTransform: 'uppercase',
                          color: 'var(--ai)',
                          marginBottom: 5,
                        }}
                      >
                        Thread summary
                      </div>
                      <div style={{ font: 'var(--type-body)', color: 'var(--text-body)', lineHeight: 1.55 }}>{data.summary}</div>
                    </div>
                  </div>
                </Card>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.messages.map((m) => (
                  <MessageCard key={m.id} msg={m} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {data && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: '16px 28px',
            background: 'rgba(244,246,250,0.82)',
            backdropFilter: 'blur(8px)',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="ai" leftIcon="sparkles" onClick={() => setReplyOpen(true)}>
              Reply with AI
            </Button>
          </div>
        </div>
      )}

      {replyOpen && threadId && <ComposeModal mode="reply" threadId={threadId} onClose={() => setReplyOpen(false)} />}
    </div>
  );
}

function MessageCard({ msg }: { msg: EmailMessage }) {
  const [open, setOpen] = useState(false);
  const from = msg.fromAddress?.name ?? msg.fromAddress?.email ?? 'Unknown';
  return (
    <div
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-xs)',
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 10 }}>
        <Avatar name={from} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' }}>{from}</div>
          {msg.fromAddress?.email && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-subtle)' }}>{msg.fromAddress.email}</div>
          )}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-subtle)' }}>{formatDateTime(msg.internalDate)}</div>
      </div>
      <p
        onClick={() => setOpen((o) => !o)}
        style={{
          font: 'var(--type-body)',
          color: 'var(--text-body)',
          margin: 0,
          cursor: 'pointer',
          whiteSpace: 'pre-wrap',
          display: open ? 'block' : '-webkit-box',
          WebkitLineClamp: open ? 'none' : 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {msg.bodyText || msg.snippet || '(no content)'}
      </p>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            marginTop: 6,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: 'var(--text-link)',
            fontFamily: 'var(--font-sans)',
            fontSize: 13,
            fontWeight: 500,
            padding: 0,
          }}
        >
          Show more
        </button>
      )}
    </div>
  );
}
