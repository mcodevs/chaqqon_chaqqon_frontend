import type { AuthGateway, Credentials } from '@/application/ports';
import type { Role, Session } from '@/application/session';
import { authEmailFor, authPasswordFor } from '../../../supabase/functions/_shared/identity';
import type { AppSupabaseClient } from './client';
import { invokeFunction } from './edgeFunctions';

/**
 * Ends the session on this device only. The supabase-js default (`global`) would also
 * revoke the account's sessions everywhere else, e.g. the teacher's phone.
 */
const THIS_DEVICE = { scope: 'local' } as const;

/** Accounts in Supabase Auth; the role comes from the user's profile row. */
export function createSupabaseAuthGateway(client: AppSupabaseClient): AuthGateway {
  const sessionFor = async (userId: string): Promise<Session | null> => {
    const { data, error } = await client.from('profiles').select('id, role').eq('id', userId).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return data.role === 'teacher' ? { role: 'teacher' } : { role: 'student', studentId: data.id };
  };

  const signIn = async (role: Role, { username, password }: Credentials): Promise<Session | null> => {
    const { data, error } = await client.auth.signInWithPassword({
      email: authEmailFor(username),
      password: authPasswordFor(password),
    });
    if (error) {
      if (error.code === 'invalid_credentials' || error.status === 400) return null;
      throw error;
    }

    const session = await sessionFor(data.user.id);
    if (session?.role !== role) {
      await client.auth.signOut(THIS_DEVICE);
      return null;
    }
    return session;
  };

  return {
    async hasTeacher() {
      const { data, error } = await client.rpc('teacher_exists');
      if (error) throw error;
      return data;
    },

    async registerTeacher(credentials) {
      await invokeFunction(client, 'register-teacher', { ...credentials });
      const session = await signIn('teacher', credentials);
      if (!session) throw new Error('The new teacher account could not sign in');
      return session;
    },

    signIn,

    async signOut() {
      const { error } = await client.auth.signOut(THIS_DEVICE);
      if (error) throw error;
    },

    async restoreSession() {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (!data.session) return null;

      const session = await sessionFor(data.session.user.id);
      // The account was deleted while the session was stored.
      if (!session) await client.auth.signOut(THIS_DEVICE);
      return session;
    },

    onSessionEnded(listener) {
      const { data } = client.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') listener();
      });
      return () => data.subscription.unsubscribe();
    },
  };
}
