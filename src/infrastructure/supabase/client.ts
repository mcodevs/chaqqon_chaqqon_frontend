import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

export interface SupabaseConfig {
  url: string;
  /** Publishable (or legacy anon) key — safe to ship to the browser. */
  publishableKey: string;
}

export function createSupabaseClient({ url, publishableKey }: SupabaseConfig) {
  return createClient<Database>(url, publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
}

export type AppSupabaseClient = ReturnType<typeof createSupabaseClient>;
