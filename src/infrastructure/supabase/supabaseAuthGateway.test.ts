import { describe, expect, it, vi } from 'vitest';
import type { AppSupabaseClient } from './client';
import { createSupabaseAuthGateway } from './supabaseAuthGateway';

interface FakeOptions {
  profile?: { id: string; role: 'teacher' | 'student' } | null;
  signInError?: { code?: string; status?: number } | null;
}

/** Just enough of the Supabase client for the gateway's sign-in and sign-out paths. */
function createFakeClient({ profile = null, signInError = null }: FakeOptions = {}) {
  const signOut = vi.fn(async (_options?: { scope?: string }) => ({ error: null }));
  const client = {
    auth: {
      signOut,
      signInWithPassword: vi.fn(async () =>
        signInError
          ? { data: { user: null, session: null }, error: signInError }
          : { data: { user: { id: profile?.id ?? 'user-1' } }, error: null },
      ),
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profile, error: null }) }) }),
    }),
  };
  return { client: client as unknown as AppSupabaseClient, signOut };
}

const credentials = { username: 'mohira', password: '1234' };

describe('supabaseAuthGateway', () => {
  it('signs out on this device only', async () => {
    const { client, signOut } = createFakeClient();
    await createSupabaseAuthGateway(client).signOut();
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it("rejects a role mismatch without ending the account's other sessions", async () => {
    const { client, signOut } = createFakeClient({ profile: { id: 't1', role: 'teacher' } });
    await expect(createSupabaseAuthGateway(client).signIn('student', credentials)).resolves.toBeNull();
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('returns the session when the role matches', async () => {
    const { client, signOut } = createFakeClient({ profile: { id: 's1', role: 'student' } });
    await expect(createSupabaseAuthGateway(client).signIn('student', credentials)).resolves.toEqual({
      role: 'student',
      studentId: 's1',
    });
    expect(signOut).not.toHaveBeenCalled();
  });

  it('treats invalid credentials as a failed sign-in', async () => {
    const { client } = createFakeClient({ signInError: { code: 'invalid_credentials', status: 400 } });
    await expect(createSupabaseAuthGateway(client).signIn('teacher', credentials)).resolves.toBeNull();
  });
});
