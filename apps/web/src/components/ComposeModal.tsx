import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useQueryClient } from '@tanstack/react-query';
import type { DraftResponse } from '@repeatless/shared';
import { api, ApiClientError } from '../lib/api';
import { Button, Dialog, Icon, ToneSelector } from '../ds';

type Mode = 'compose' | 'reply';
type Stage = 'prompt' | 'draft' | 'sent';
const TONES = ['Professional', 'Friendly', 'Concise', 'Formal'];

export function ComposeModal({ mode, threadId, onClose }: { mode: Mode; threadId?: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [stage, setStage] = useState<Stage>('prompt');
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState('Professional');
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [to, setTo] = useState('');

  const generate = useMutation({
    mutationFn: () => {
      const t = tone.toLowerCase();
      return mode === 'reply' ? api.reply(threadId!, prompt, t) : api.compose(prompt, t);
    },
    onSuccess: (d) => {
      setDraft(d);
      setTo(d.to.join(', '));
      setStage('draft');
    },
  });

  const send = useMutation({
    mutationFn: () => {
      const recipients = to.split(',').map((s) => s.trim()).filter(Boolean);
      return api.send({ ...draft!, to: recipients });
    },
    onSuccess: () => {
      setStage('sent');
      qc.invalidateQueries({ queryKey: ['syncStatus'] });
    },
  });

  const title = mode === 'reply' ? 'Reply with AI' : 'Compose with AI';
  const subtitle =
    stage === 'draft' ? 'Review and edit before sending.' : stage === 'sent' ? undefined : 'Describe the email and pick a tone.';

  let footer: React.ReactNode;
  if (stage === 'prompt') {
    footer = (
      <>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="ai" leftIcon="sparkles" loading={generate.isPending} disabled={!prompt.trim()} onClick={() => generate.mutate()}>
          Draft email
        </Button>
      </>
    );
  } else if (stage === 'draft') {
    footer = (
      <>
        <Button variant="secondary" leftIcon="sparkles" loading={generate.isPending} onClick={() => generate.mutate()}>
          Re-draft
        </Button>
        <Button leftIcon="send" loading={send.isPending} disabled={!to.trim()} onClick={() => send.mutate()}>
          Send
        </Button>
      </>
    );
  } else {
    footer = <Button onClick={onClose}>Done</Button>;
  }

  return (
    <Dialog title={title} subtitle={subtitle} width={560} onClose={onClose} footer={footer}>
      {stage === 'prompt' && (
        <div>
          <label style={{ display: 'block', marginBottom: 14 }}>
            <span style={fieldLabel}>What should this email say?</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="e.g. Write a follow-up about the Q3 launch delay."
              style={textareaStyle}
            />
          </label>
          <div style={{ ...fieldLabel, marginBottom: 8 }}>Tone</div>
          <ToneSelector options={TONES} value={tone} onChange={setTone} />
          {generate.isError && <ErrorLine error={generate.error} />}
        </div>
      )}

      {stage === 'draft' && draft && (
        <div>
          <Field label="To">
            <input value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} placeholder="name@example.com, …" />
          </Field>
          <Field label="Subject">
            <input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Body">
            <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={9} style={textareaStyle} />
          </Field>
          {send.isError && <ErrorLine error={send.error} />}
        </div>
      )}

      {stage === 'sent' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '20px 0 8px', gap: 8 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--success-soft)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="check" size={26} strokeWidth={2.5} />
          </div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 600, color: 'var(--text-strong)' }}>Sent</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-muted)' }}>Your email is on its way.</div>
        </div>
      )}
    </Dialog>
  );
}

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-sans)',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  height: 38,
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  padding: '0 12px',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  color: 'var(--text-strong)',
  outline: 'none',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  resize: 'vertical',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-md)',
  padding: '10px 12px',
  fontFamily: 'var(--font-sans)',
  fontSize: 14,
  lineHeight: 1.55,
  color: 'var(--text-strong)',
  outline: 'none',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

function ErrorLine({ error }: { error: unknown }) {
  const msg = error instanceof ApiClientError ? error.message : 'Something went wrong';
  return <p style={{ font: 'var(--type-body-sm)', color: 'var(--danger)', marginTop: 10 }}>{msg}</p>;
}
