import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  POSTGRES_UNIQUE_VIOLATION,
  createAdminClient,
  getCallerId,
  isEmailTaken,
} from '../_shared/clients.ts';
import { type Body, fail, handle, json, readJson } from '../_shared/http.ts';
import { authEmailFor, authPasswordFor } from '../_shared/identity.ts';
import { readId, readName, readPassword, readUsername } from '../_shared/validation.ts';

/**
 * Teacher-only student account management. Auth admin APIs need the service role,
 * which must never reach the browser, so they run here.
 */
Deno.serve(
  handle(async (request) => {
    const admin = createAdminClient();
    const callerId = await getCallerId(admin, request);
    if (!callerId) return fail('UNAUTHORIZED', 401);
    if ((await roleOf(admin, callerId)) !== 'teacher') return fail('FORBIDDEN', 403);

    const body = await readJson(request);
    switch (body?.action) {
      case 'create':
        return createStudent(admin, body);
      case 'set-password':
        return setPassword(admin, body);
      case 'delete':
        return deleteStudent(admin, body);
      default:
        return fail('BAD_REQUEST', 400);
    }
  }),
);

async function roleOf(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (error) throw error;
  return data?.role ?? null;
}

async function createStudent(admin: SupabaseClient, body: Body): Promise<Response> {
  const username = readUsername(body.username);
  if (!username) return fail('INVALID_USERNAME', 400);
  const password = readPassword(body.password);
  if (!password) return fail('PASSWORD_TOO_SHORT', 400);
  const firstName = readName(body.firstName);
  const lastName = readName(body.lastName ?? '');
  if (!firstName || lastName === null) return fail('BAD_REQUEST', 400);

  const { data, error } = await admin.auth.admin.createUser({
    email: authEmailFor(username),
    password: authPasswordFor(password),
    email_confirm: true,
  });
  if (error) {
    if (isEmailTaken(error)) return fail('USERNAME_TAKEN', 409);
    throw error;
  }

  const student = { id: data.user.id, username, firstName, lastName };
  const { error: profileError } = await admin.from('profiles').insert({
    id: student.id,
    role: 'student',
    username,
    first_name: firstName,
    last_name: lastName,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(student.id);
    if (profileError.code === POSTGRES_UNIQUE_VIOLATION) return fail('USERNAME_TAKEN', 409);
    throw profileError;
  }

  return json({ student }, 201);
}

async function setPassword(admin: SupabaseClient, body: Body): Promise<Response> {
  const studentId = readId(body.studentId);
  const password = readPassword(body.password);
  if (!studentId) return fail('BAD_REQUEST', 400);
  if (!password) return fail('PASSWORD_TOO_SHORT', 400);
  if ((await roleOf(admin, studentId)) !== 'student') return fail('STUDENT_NOT_FOUND', 404);

  const { error } = await admin.auth.admin.updateUserById(studentId, {
    password: authPasswordFor(password),
  });
  if (error) throw error;
  return json({ ok: true });
}

async function deleteStudent(admin: SupabaseClient, body: Body): Promise<Response> {
  const studentId = readId(body.studentId);
  if (!studentId) return fail('BAD_REQUEST', 400);
  if ((await roleOf(admin, studentId)) !== 'student') return fail('STUDENT_NOT_FOUND', 404);

  // The profile, results and competition progress are removed by ON DELETE CASCADE.
  const { error } = await admin.auth.admin.deleteUser(studentId);
  if (error) throw error;
  return json({ ok: true });
}
