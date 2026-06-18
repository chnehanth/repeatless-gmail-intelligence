import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { ChatMessage } from '@repeatless/shared';
import { api } from '../lib/api';
import { ChatBubble, Icon, SourceCard } from '../ds';

const SUGGESTIONS = [
  'Which companies rejected my job application?',
  "Summarize this week's finance updates.",
  'What has been discussed about any ongoing projects?',
  'List the important tech news from the past few days.',
];

export function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: (text: string) => api.chat(text, sessionId),
    onSuccess: (res) => {
      setSessionId(res.sessionId);
      setMessages((prev) => [...prev, res.message]);
    },
  });

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, ask.isPending]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || ask.isPending) return;
    setMessages((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, sessionId: sessionId ?? 'pending', role: 'user', content: trimmed, citations: [], createdAt: new Date().toISOString() },
    ]);
    setInput('');
    ask.mutate(trimmed);
  }

  const empty = messages.length === 0 && !ask.isPending;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '22px 28px 8px', flex: 'none', borderBottom: '1px solid var(--border-subtle)' }}>
        <h1 style={{ font: 'var(--type-h2)', letterSpacing: '-0.02em', color: 'var(--text-strong)', margin: 0 }}>Ask AI</h1>
        <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)', margin: '4px 0 14px' }}>
          Answers cite the emails they came from.
        </p>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: '24px 28px' }}>
          {empty ? (
            <div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>
                Try asking…
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    style={{
                      textAlign: 'left',
                      background: 'var(--surface-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '13px 15px',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-sans)',
                      fontSize: 14,
                      color: 'var(--text-body)',
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {messages.map((m) =>
                m.role === 'user' ? (
                  <ChatBubble key={m.id} role="user">
                    {m.content}
                  </ChatBubble>
                ) : (
                  <ChatBubble
                    key={m.id}
                    role="assistant"
                    footer={
                      m.citations.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                          {m.citations.map((c, i) => (
                            <SourceCard
                              key={`${c.messageId}-${i}`}
                              index={i + 1}
                              subject={c.subject ?? '(no subject)'}
                              sender={c.sender ?? undefined}
                              date={c.date ?? undefined}
                              onClick={() => navigate(`/inbox/${c.threadId}`)}
                            />
                          ))}
                        </div>
                      ) : undefined
                    }
                  >
                    <span style={{ whiteSpace: 'pre-wrap' }}>{m.content}</span>
                  </ChatBubble>
                ),
              )}
              {ask.isPending && <ChatBubble role="assistant" typing />}
              {ask.isError && (
                <p style={{ font: 'var(--type-body-sm)', color: 'var(--danger)' }}>
                  Couldn&apos;t get an answer. Try again.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 'none', padding: '12px 28px 22px', background: 'var(--surface-page)' }}>
        <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--surface-card)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              padding: '7px 7px 7px 16px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send(input)}
              placeholder="Ask anything about your inbox…"
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                color: 'var(--text-strong)',
              }}
            />
            <button
              onClick={() => send(input)}
              aria-label="Send"
              disabled={!input.trim() || ask.isPending}
              style={{
                width: 38,
                height: 38,
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: input.trim() && !ask.isPending ? 'pointer' : 'not-allowed',
                background: 'var(--accent)',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: input.trim() && !ask.isPending ? 1 : 0.5,
              }}
            >
              <Icon name="arrowUp" size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
