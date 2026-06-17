import type { gmail_v1 } from 'googleapis';
import type { GmailLabel } from '@repeatless/shared';
import { supabase } from '../db/supabase.js';
import { internal } from '../lib/errors.js';

export async function upsertLabels(userId: string, labels: gmail_v1.Schema$Label[]): Promise<void> {
  if (labels.length === 0) return;
  const rows = labels
    .filter((l) => l.id && l.name)
    .map((l) => ({
      user_id: userId,
      gmail_label_id: l.id as string,
      name: l.name as string,
      type: l.type === 'system' ? 'system' : 'user',
    }));
  const { error } = await supabase.from('labels').upsert(rows, { onConflict: 'user_id,gmail_label_id' });
  if (error) throw internal('Failed to upsert labels', error);
}

export async function listLabels(userId: string): Promise<GmailLabel[]> {
  const { data, error } = await supabase
    .from('labels')
    .select('gmail_label_id, name, type')
    .eq('user_id', userId)
    .order('name');
  if (error) throw internal('Failed to list labels', error);
  return (data ?? []).map((r) => ({
    id: r.gmail_label_id as string,
    name: r.name as string,
    type: r.type as 'system' | 'user',
  }));
}
