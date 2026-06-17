import { useRef, useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import type { ChatMessage, SourceCitation } from '@repeatless/shared';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/ui';

const SUGGESTIONS = [
  'Which companies rejected my job application? List them all.',
  'Summarize all emails from the last week.',
  'What has been discussed about any ongoing projects?',
  'Give me an overview of what I know about a topic from my emails.',
];

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>();
  const bottomRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: (text: string) => api.chat(text, sessionId),
    onSuccess: (res) => {
      setSessionId(res.sessionId);
      setMessages((prev) => [...prev, res.message]);
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, ask.isPending]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed || ask.isPending) return;
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      sessionId: sessionId ?? 'pending',
      role: 'user',
      content: trimmed,
      citations: [],
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');
    ask.mutate(trimmed);
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col p-6">
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Ask your inbox</h1>
      <p className="mb-4 text-sm text-slate-500">
        Answers are grounded in your emails, with sources. The assistant won&apos;t make things up.
      </p>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-xl bg-white p-4 ring-1 ring-slate-200">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-slate-400">Try asking:</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => submit(s)}
                className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}

        {ask.isPending && (
          <div className="flex gap-1 text-slate-400">
            <span className="animate-bounce">●</span>
            <span className="animate-bounce [animation-delay:0.15s]">●</span>
            <span className="animate-bounce [animation-delay:0.3s]">●</span>
          </div>
        )}
        {ask.isError && <p className="text-sm text-red-600">Failed to get an answer. Please try again.</p>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your emails…"
          className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || ask.isPending}
          className="rounded-lg bg-brand-600 px-5 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] ${isUser ? '' : 'w-full'}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm ${
            isUser ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
        {message.citations.length > 0 && <Citations citations={message.citations} />}
      </div>
    </div>
  );
}

function Citations({ citations }: { citations: SourceCitation[] }) {
  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-xs font-medium text-slate-400">Sources</p>
      {citations.map((c, i) => (
        <Link
          key={`${c.messageId}-${i}`}
          to={`/inbox/${c.threadId}`}
          className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs hover:bg-slate-50"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-700">[S{i + 1}] {c.subject || '(no subject)'}</span>
            <span className="text-slate-400">{formatDateTime(c.date)}</span>
          </div>
          <p className="text-slate-500">{c.sender}</p>
        </Link>
      ))}
    </div>
  );
}
