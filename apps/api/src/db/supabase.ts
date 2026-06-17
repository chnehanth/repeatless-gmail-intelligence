import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import { childLogger } from '../observability/logger.js';
import { internal } from '../lib/errors.js';

const log = childLogger('supabase');

/**
 * Single shared Supabase client using the service-role key. Server-side only.
 * Per-user scoping is enforced in the repository layer (every query filters by
 * user_id), since the service role bypasses RLS.
 */
export const supabase: SupabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { 'x-application-name': 'repeatless-api' } },
});

/** Throw a typed error on a Supabase response error, otherwise return data. */
export function unwrap<T>(
  result: { data: T | null; error: { message: string; code?: string } | null },
  context: string,
): T {
  if (result.error) {
    log.error({ context, err: result.error.message, code: result.error.code }, 'supabase query failed');
    throw internal(`Database error during ${context}`, result.error);
  }
  if (result.data === null) {
    throw internal(`Database returned no data during ${context}`);
  }
  return result.data;
}

export async function checkDbHealth(): Promise<boolean> {
  try {
    const { error } = await supabase.from('users').select('id', { count: 'exact', head: true }).limit(1);
    return !error;
  } catch {
    return false;
  }
}
