export type BackendConfig = { kind: 'local' } | { kind: 'supabase'; url: string; publishableKey: string };

type BackendEnv = Partial<Record<'VITE_SUPABASE_URL' | 'VITE_SUPABASE_PUBLISHABLE_KEY', string>>;

/** Supabase is used when both variables are set; with neither, the app runs on browser storage. */
export function readBackendConfig(env: BackendEnv = import.meta.env): BackendConfig {
  const url = env.VITE_SUPABASE_URL?.trim();
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (url && publishableKey) return { kind: 'supabase', url, publishableKey };
  if (url || publishableKey) {
    throw new Error('Set both VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY, or neither of them');
  }
  return { kind: 'local' };
}
