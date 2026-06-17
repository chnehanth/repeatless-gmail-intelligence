import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { DraftResponse } from '@repeatless/shared';
import { api, ApiClientError } from '../lib/api';

const TONES = ['professional', 'friendly', 'concise', 'formal'];

export function ComposeModal({ onClose }: { onClose: () => void }) {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('professional');
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [toInput, setToInput] = useState('');
  const [sent, setSent] = useState(false);

  const generate = useMutation({
    mutationFn: () => api.compose(prompt, tone),
    onSuccess: (d) => setDraft(d),
  });

  const send = useMutation({
    mutationFn: () => {
      const to = toInput.split(',').map((s) => s.trim()).filter(Boolean);
      return api.send({ ...draft!, to });
    },
    onSuccess: () => {
      setSent(true);
      setTimeout(onClose, 1200);
    },
  });

  return (
    <Modal title="Compose with AI" onClose={onClose}>
      {sent ? (
        <p className="py-8 text-center text-emerald-600">✓ Email sent!</p>
      ) : !draft ? (
        <>
          <label className="mb-1 block text-sm font-medium text-slate-700">What should this email say?</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="e.g. Write a follow-up to the product team about the Q3 launch delay"
            className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-brand-500"
          />
          <div className="mt-3 flex items-center justify-between">
            <select value={tone} onChange={(e) => setTone(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <button
              onClick={() => generate.mutate()}
              disabled={!prompt.trim() || generate.isPending}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {generate.isPending ? 'Drafting…' : 'Draft email'}
            </button>
          </div>
          {generate.isError && <ErrorLine error={generate.error} />}
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

export function DraftEditor({
  draft,
  toInput,
  setToInput,
  onChange,
  onBack,
  onSend,
  sending,
  error,
}: {
  draft: DraftResponse;
  toInput: string;
  setToInput: (v: string) => void;
  onChange: (d: DraftResponse) => void;
  onBack: () => void;
  onSend: () => void;
  sending: boolean;
  error: unknown;
}) {
  return (
    <div className="space-y-3">
      <Field label="To (comma-separated)">
        <input
          value={toInput || draft.to.join(', ')}
          onChange={(e) => setToInput(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </Field>
      <Field label="Subject">
        <input
          value={draft.subject}
          onChange={(e) => onChange({ ...draft, subject: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        />
      </Field>
      <Field label="Body">
        <textarea
          value={draft.body}
          onChange={(e) => onChange({ ...draft, body: e.target.value })}
          rows={10}
          className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-brand-500"
        />
      </Field>
      {error ? <ErrorLine error={error} /> : null}
      <div className="flex justify-between">
        <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700">
          ← Re-draft
        </button>
        <button
          onClick={onSend}
          disabled={sending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function ErrorLine({ error }: { error: unknown }) {
  const msg = error instanceof ApiClientError ? error.message : 'Something went wrong';
  return <p className="text-sm text-red-600">{msg}</p>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
