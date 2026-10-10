import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import {
  POSTGRES_UNIQUE_VIOLATION,
  createAdminClient,
  getCallerId,
  isEmailTaken,
  raisedCode,
  roleOf,
} from '../_shared/clients.ts';
import { type Body, fail, handle, json, readJson } from '../_shared/http.ts';
import { authEmailFor, authPasswordFor } from '../_shared/identity.ts';
import {
  MIN_TEACHER_PASSWORD_LENGTH,
  readAmount,
  readCenterName,
  readId,
  readName,
  readOptionalDate,
  readPassword,
  readPhone,
  readUsername,
} from '../_shared/validation.ts';

/**
 * Superadmin-only teacher accounts. Teachers do not sign themselves up: they leave an application and
 * the admin creates the sign-in here, with the tariff and the first billing day.
 */
Deno.serve(
  handle(async (request) => {
    const admin = createAdminClient();
    const callerId = await getCallerId(admin, request);
    if (!callerId) return fail('UNAUTHORIZED', 401);
    if ((await roleOf(admin, callerId)) !== 'admin') return fail('FORBIDDEN', 403);

    const body = await readJson(request);
    switch (body?.action) {
      case 'create':
        return createTeacher(admin, callerId, body);
      case 'set-password':
        return setPassword(admin, body);
      default:
        return fail('BAD_REQUEST', 400);
    }
  }),
);

async function createTeacher(admin: SupabaseClient, adminId: string, body: Body): Promise<Response> {
  const username = readUsername(body.username);
  if (!username) return fail('INVALID_USERNAME', 400);
  const password = readPassword(body.password, MIN_TEACHER_PASSWORD_LENGTH);
  if (!password) return fail('PASSWORD_TOO_SHORT', 400);
  const firstName = readName(body.firstName);
  const lastName = readName(body.lastName ?? '');
  const phone = readPhone(body.phone);
  const centerName = readCenterName(body.centerName);
  if (!firstName || lastName === null || phone === null || centerName === null) return fail('BAD_REQUEST', 400);
  const tariffId = readId(body.tariffId);
  if (!tariffId) return fail('TARIFF_NOT_FOUND', 400);
  const billingStartsOn = readOptionalDate(body.billingStartsOn);
  if (billingStartsOn === undefined) return fail('INVALID_DATE', 400);
  const bonus = readAmount(body.bonus);
  if (bonus === null) return fail('INVALID_AMOUNT', 400);

  const { data, error } = await admin.auth.admin.createUser({
    email: authEmailFor(username),
    password: authPasswordFor(password),
    email_confirm: true,
  });
  if (error) {
    if (isEmailTaken(error)) return fail('USERNAME_TAKEN', 409);
    throw error;
  }

  const id = data.user.id;
  const { error: recordsError } = await admin.rpc('create_teacher_records', {
    p_id: id,
    p_username: username,
    p_first_name: firstName,
    p_last_name: lastName,
    p_phone: phone,
    p_center_name: centerName,
    p_tariff_id: tariffId,
    p_billing_starts_on: billingStartsOn,
    p_bonus: bonus,
    p_admin: adminId,
  });
  if (recordsError) {
    await admin.auth.admin.deleteUser(id);
    if (recordsError.code === POSTGRES_UNIQUE_VIOLATION) return fail('USERNAME_TAKEN', 409);
    if (raisedCode(recordsError, ['TARIFF_NOT_FOUND'] as const)) return fail('TARIFF_NOT_FOUND', 400);
    throw recordsError;
  }

  return json({ teacher: { id, username, firstName, lastName } }, 201);
}

async function setPassword(admin: SupabaseClient, body: Body): Promise<Response> {
  const teacherId = readId(body.teacherId);
  const password = readPassword(body.password, MIN_TEACHER_PASSWORD_LENGTH);
  if (!teacherId) return fail('BAD_REQUEST', 400);
  if (!password) return fail('PASSWORD_TOO_SHORT', 400);
  if ((await roleOf(admin, teacherId)) !== 'teacher') return fail('TEACHER_NOT_FOUND', 404);

  const { error } = await admin.auth.admin.updateUserById(teacherId, { password: authPasswordFor(password) });
  if (error) throw error;
  return json({ ok: true });
}
