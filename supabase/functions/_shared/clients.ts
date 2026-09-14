import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

export const POSTGRES_UNIQUE_VIOLATION = '23505';

function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

/** Service-role client. It bypasses RLS, so use it only after checking who is calling. */
export function createAdminClient(): SupabaseClient {
  return createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** The signed-in user behind the request's bearer token, or null for guests and bad tokens. */
export async function getCallerId(admin: SupabaseClient, request: Request): Promise<string | null> {
  const token = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user.id;
}

export function isEmailTaken(error: { code?: string; message: string }): boolean {
  return error.code === 'email_exists' || /already (been )?registered/i.test(error.message);
}
