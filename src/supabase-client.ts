import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config.js';

/** Database type placeholder — will be generated later with `supabase gen types` */
export type Database = Record<string, any>;

/**
 * Service-role client — bypasses RLS.
 * Used by the NanoClaw runtime, agents, and internal operations.
 */
export const supabaseAdmin: SupabaseClient = createClient(
  config.supabaseUrl,
  config.supabaseServiceKey,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

/**
 * Anon client — respects RLS.
 * Used when forwarding user requests or for Realtime subscriptions.
 */
export const supabaseAnon: SupabaseClient = createClient(
  config.supabaseUrl,
  config.supabaseAnonKey,
);

/**
 * Creates a Supabase client authenticated with a specific user's JWT.
 * Used for per-user RLS enforcement.
 */
/**
 * Creates a Supabase client authenticated with a specific user's JWT.
 * Used for per-user RLS enforcement.
 */
export function supabaseWithAuth(jwt: string): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

// ── Legacy aliases (kept for backward compat until all imports are migrated) ─
export const supabase = supabaseAdmin;
export const supabaseRealtime = supabaseAnon;
