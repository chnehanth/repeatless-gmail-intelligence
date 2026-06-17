import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import type { DraftResponse, EmailThread } from '@repeatless/shared';
import { api } from '../lib/api';
import { categoryClass, formatDateTime } from '../lib/ui';
import { DraftEditor, Modal } from '../components/ComposeModal';

type ThreadWithMessages = EmailThread & { messages: NonNullable<EmailThread['messages']> };

export function ThreadView() {
  const { threadId } = useParams<{ threadId: string }>();
  const [replyOpen, setReplyOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['thread', threadId],
    queryFn: () => api.getThread(threadId!) as Promise<ThreadWithMessages>,
    enabled: Boolean(threadId),
  });

  if (isLoading) return <div className="p-6 text-slate-400">Loading thread…</div>;
  if (isError || !data) return <div className="p-6 text-red-500">Could not load this thread.</div>;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link to="/inbox" className="mb-4 inline-block text-sm text-brand-600 hover:underline">
        ← Back to inbox
      </Link>

      <div className="mb-4 flex items-start justify-between gap-4">
        <h1 className="text-xl font-bold text-slate-900">{data.subject || '(no subject)'}</h1>
        {data.category && (
          <span className={`flex-none rounded-full px-2.5 py-1 text-xs font-medium ${categoryClass(data.category)}`}>
            {data.category}
          </span>
        )}
      </div>

      {data.summary && (
        <div className="mb-5 rounded-xl border border-brand-100 bg-brand-50 p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-700">AI thread summary</p>
          <p className="text-sm text-slate-700">{data.summary}</p>
        </div>
      )}

      <div className="space-y-3">
        {data.messages.map((m) => (
          <MessageCard key={m.id} message={m} />
        ))}
      </div>

      <div className="sticky bottom-0 mt-6 bg-slate-50 py-3">
        <button
          onClick={() => setReplyOpen(true)}
          className="w-full rounded-lg bg-brand-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
        >
          ↩ Reply with AI
        </button>
      </div>

      {replyOpen && threadId && <ReplyModal threadId={threadId} onClose={() => setReplyOpen(false)} />}
    </div>
  );
}

function MessageCard({ message }: { message: NonNullable<EmailThread['messages']>[number] }) {
  const [expanded, setExpanded] = useState(false);
  const sender = message.fromAddress?.name ?? message.fromAddress?.email ?? 'Unknown';
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="font-semibold text-slate-800">{sender}</span>
          {message.fromAddress?.name && <span className="ml-1 text-slate-400">{message.fromAddress.email}</span>}
        </div>
        <span className="text-xs text-slate-400">{formatDateTime(message.internalDate)}</span>
      </div>
      <button onClick={() => setExpanded((v) => !v)} className="mt-2 w-full text-left">
        <p className={`whitespace-pre-wrap text-sm text-slate-600 ${expanded ? '' : 'line-clamp-3'}`}>
          {message.bodyText || message.snippet || '(no content)'}
        </p>
        <span className="mt-1 inline-block text-xs text-brand-600">{expanded ? 'Show less' : 'Show more'}</span>
      </button>
    </div>
  );
}

function ReplyModal({ threadId, onClose }: { threadId: string; onClose: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('professional');
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [toInput, setToInput] = useState('');
  const [sent, setSent] = useState(false);

  const generate = useMutation({ mutationFn: () => api.reply(threadId, prompt, tone), onSuccess: setDraft });
  const send = useMutation({
    mutationFn: () => {
      const to = (toInput || draft!.to.join(', ')).split(',').map((s) => s.trim()).filter(Boolean);
      return api.send({ ...draft!, to });
    },
    onSuccess: () => {
      setSent(true);
      setTimeout(onClose, 1200);
    },
  });

  return (
    <Modal title="Reply with AI" onClose={onClose}>
      {sent ? (
        <p className="py-8 text-center text-emerald-600">✓ Reply sent!</p>
      ) : !draft ? (
        <>
          <p className="mb-2 text-xs text-slate-500">The AI reads the full thread for context.</p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="e.g. Agree to the meeting, propose Thursday 3pm"
            className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-brand-500"
          />
          <div className="mt-3 flex items-center justify-between">
            <select value={tone} onChange={(e) => setTone(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
              {['professional', 'friendly', 'concise', 'formal'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <button
              onClick={() => generate.mutate()}
              disabled={!prompt.trim() || generate.isPending}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {generate.isPending ? 'Drafting…' : 'Draft reply'}
            </button>
          </div>
        </>
      ) : (
        <DraftEditor
          draft={draft}
          toInput={toInput}
          setToInput={setToInput}
          onChange={setDraft}
          onBack={() => setDraft(null)}
          onSend={() => send.mutate()}
          sending={send.isPending}
          error={send.error}
        />
      )}
    </Modal>
  );
}
