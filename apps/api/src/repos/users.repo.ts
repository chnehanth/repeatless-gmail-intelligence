import type { Credentials } from 'google-auth-library';
import type { SyncStatus, UserProfile } from '@repeatless/shared';
import { supabase } from '../db/supabase.js';
import { decryptSecret, encryptSecret } from '../lib/crypto.js';
import { internal, notFound } from '../lib/errors.js';

/** Persistence for users, their encrypted OAuth credentials, and sync state. */

export interface DbUser {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export async function upsertUser(input: {
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}): Promise<DbUser> {
  const { data, error } = await supabase
    .from('users')
    .upsert(
      { email: input.email, display_name: input.displayName, avatar_url: input.avatarUrl },
      { onConflict: 'email' },
    )
    .select('id, email, display_name, avatar_url, created_at')
    .single();
  if (error || !data) throw internal('Failed to upsert user', error);
  return data as DbUser;
}

export async function saveCredentials(userId: string, creds: Credentials): Promise<void> {
  if (!creds.refresh_token) {
    // Google only returns refresh_token on first consent. If absent, keep the
    // existing stored one rather than wiping it.
    const existing = await supabase
      .from('oauth_credentials')
      .select('refresh_token_enc')
      .eq('user_id', userId)
      .maybeSingle();
    if (!existing.data?.refresh_token_enc) {
      throw internal('No refresh token returned by Google and none stored. Re-consent required.');
    }
  }

  const payload: Record<string, unknown> = {
    user_id: userId,
    provider: 'google',
    access_token_enc: creds.access_token ? encryptSecret(creds.access_token) : null,
    scope: creds.scope ?? null,
    token_type: creds.token_type ?? null,
    expiry: creds.expiry_date ? new Date(creds.expiry_date).toISOString() : null,
  };
  if (creds.refresh_token) payload.refresh_token_enc = encryptSecret(creds.refresh_token);

  const { error } = await supabase.from('oauth_credentials').upsert(payload, { onConflict: 'user_id' });
  if (error) throw internal('Failed to save OAuth credentials', error);
}

export async function getCredentials(userId: string): Promise<Credentials> {
  const { data, error } = await supabase
    .from('oauth_credentials')
    .select('access_token_enc, refresh_token_enc, scope, token_type, expiry')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw internal('Failed to load OAuth credentials', error);
  if (!data) throw notFound('No Gmail connection found for this user');

  return {
    access_token: data.access_token_enc ? decryptSecret(data.access_token_enc) : null,
    refresh_token: decryptSecret(data.refresh_token_enc),
    scope: data.scope ?? undefined,
    token_type: data.token_type ?? undefined,
    expiry_date: data.expiry ? new Date(data.expiry).getTime() : undefined,
  };
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, display_name, avatar_url, created_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw internal('Failed to load user', error);
  if (!data) throw notFound('User not found');

  const sync = await getSyncState(userId);
  return {
    id: data.id,
    email: data.email,
    displayName: data.display_name,
    avatarUrl: data.avatar_url,
    createdAt: data.created_at,
    syncStatus: sync.status,
    lastSyncedAt: sync.lastSyncedAt,
  };
}

export interface SyncStateRow {
  status: SyncStatus;
  historyId: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  totalMessages: number;
}

export async function getSyncState(userId: string): Promise<SyncStateRow> {
  const { data } = await supabase
    .from('sync_state')
    .select('status, history_id, last_synced_at, last_error, total_messages')
    .eq('user_id', userId)
    .maybeSingle();
  return {
    status: (data?.status as SyncStatus) ?? 'idle',
    historyId: data?.history_id ?? null,
    lastSyncedAt: data?.last_synced_at ?? null,
    lastError: data?.last_error ?? null,
    totalMessages: data?.total_messages ?? 0,
  };
}

export async function updateSyncState(
  userId: string,
  patch: Partial<{
    status: SyncStatus;
    historyId: string | null;
    lastSyncedAt: string | null;
    lastError: string | null;
    totalMessages: number;
  }>,
): Promise<void> {
  const row: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() };
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.historyId !== undefined) row.history_id = patch.historyId;
  if (patch.lastSyncedAt !== undefined) row.last_synced_at = patch.lastSyncedAt;
  if (patch.lastError !== undefined) row.last_error = patch.lastError;
  if (patch.totalMessages !== undefined) row.total_messages = patch.totalMessages;
  const { error } = await supabase.from('sync_state').upsert(row, { onConflict: 'user_id' });
  if (error) throw internal('Failed to update sync state', error);
}

/** List all users that have stored credentials — used by the background scheduler. */
export async function listSyncableUserIds(): Promise<string[]> {
  const { data, error } = await supabase.from('oauth_credentials').select('user_id');
  if (error) throw internal('Failed to list syncable users', error);
  return (data ?? []).map((r) => r.user_id as string);
}

/** Resolve the seeded demo user's id by email, or null if not seeded. */
export async function getDemoUserId(email: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .eq('is_demo', true)
    .maybeSingle();
  if (error) throw internal('Failed to look up demo user', error);
  return (data?.id as string | undefined) ?? null;
}

/** Whether a user is the seeded demo account (guards real-Gmail side effects). */
export async function isDemoUser(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from('users').select('is_demo').eq('id', userId).maybeSingle();
  if (error) throw internal('Failed to check demo flag', error);
  return Boolean(data?.is_demo);
}
