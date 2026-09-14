import { POSTGRES_UNIQUE_VIOLATION, createAdminClient, isEmailTaken } from '../_shared/clients.ts';
import { fail, handle, json, readJson } from '../_shared/http.ts';
import { authEmailFor, authPasswordFor } from '../_shared/identity.ts';
import { readPassword, readUsername } from '../_shared/validation.ts';

/** Creates the single teacher account. Open to guests, but only until a teacher exists. */
Deno.serve(
  handle(async (request) => {
    const body = await readJson(request);
    const username = readUsername(body?.username);
    if (!username) return fail('INVALID_USERNAME', 400);
    const password = readPassword(body?.password);
    if (!password) return fail('PASSWORD_TOO_SHORT', 400);

    const admin = createAdminClient();
    const { data: teacherExists, error: lookupError } = await admin.rpc('teacher_exists');
    if (lookupError) throw lookupError;
    if (teacherExists) return fail('TEACHER_EXISTS', 409);

    const { data, error } = await admin.auth.admin.createUser({
      email: authEmailFor(username),
      password: authPasswordFor(password),
      email_confirm: true,
    });
    if (error) {
      if (isEmailTaken(error)) return fail('TEACHER_EXISTS', 409);
      throw error;
    }

    const { error: profileError } = await admin
      .from('profiles')
      .insert({ id: data.user.id, role: 'teacher', username });
    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      // Another teacher was registered at the same moment (single-teacher unique index).
      if (profileError.code === POSTGRES_UNIQUE_VIOLATION) return fail('TEACHER_EXISTS', 409);
      throw profileError;
    }

    return json({ ok: true }, 201);
  }),
);
