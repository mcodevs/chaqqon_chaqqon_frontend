import { AppError } from '@/application/errors';
import type { AuthGateway, Credentials } from '@/application/ports';
import type { LoginRole, Session } from '@/application/session';
import { authEmailFor, authPasswordFor } from '../../../supabase/functions/_shared/identity';
import type { AppSupabaseClient } from './client';

/**
 * Ends the session on this device only. The supabase-js default (`global`) would also
 * revoke the account's sessions everywhere else, e.g. the teacher's phone.
 */
const THIS_DEVICE = { scope: 'local' } as const;

/** The superadmin uses the teacher form; it has no form of its own. */
const ROLES_FOR_FORM: Record<LoginRole, readonly Session['role'][]> = {
  student: ['student'],
  teacher: ['teacher', 'admin'],
};

/** Accounts in Supabase Auth; the role comes from the user's profile row. */
export function createSupabaseAuthGateway(client: AppSupabaseClient): AuthGateway {
  const sessionFor = async (userId: string): Promise<Session | null> => {
    const { data, error } = await client
      .from('profiles')
      .select('id, role, teacher_id')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    if (data.role === 'admin') return { role: 'admin', adminId: data.id };
    if (data.role === 'teacher') return { role: 'teacher', teacherId: data.id };
    return data.teacher_id ? { role: 'student', studentId: data.id, teacherId: data.teacher_id } : null;
  };

  const signIn = async (role: LoginRole, { username, password }: Credentials): Promise<Session | null> => {
    const { data, error } = await client.auth.signInWithPassword({
      email: authEmailFor(username),
      password: authPasswordFor(password),
    });
    if (error) {
      if (error.code === 'invalid_credentials' || error.status === 400) return null;
      throw error;
    }

    const session = await sessionFor(data.user.id);
    if (!session || !ROLES_FOR_FORM[role].includes(session.role)) {
      await client.auth.signOut(THIS_DEVICE);
      return null;
    }
    return session;
  };

  return {
    // The superadmin account is created by hand on Supabase, never from the app.
    needsSetup: async () => false,

    async setUpAdmin() {
      throw new AppError('ALREADY_SET_UP');
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
