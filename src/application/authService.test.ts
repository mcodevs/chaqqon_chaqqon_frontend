import { describe, expect, it } from 'vitest';
import { TEST_TEACHER_ID, createTestDependencies } from '@/testing/fakes';
import { createAdminService } from './adminService';
import { createAuthService } from './authService';
import { createStudentService } from './studentService';

async function setup() {
  const deps = await createTestDependencies();
  return {
    deps,
    auth: createAuthService(deps),
    studentService: createStudentService(deps),
    adminService: createAdminService(deps),
  };
}

const validAdmin = { username: ' Boss ', password: 'secret', passwordConfirmation: 'secret' };

describe('authService', () => {
  it('sets the superadmin up once, keeps the session and logs out', async () => {
    const { auth } = await setup();
    expect(await auth.needsSetup()).toBe(true);

    const session = await auth.setUpAdmin(validAdmin);
    expect(session).toMatchObject({ role: 'admin' });
    expect(await auth.needsSetup()).toBe(false);
    expect(await auth.restoreSession()).toEqual(session);
    await expect(auth.setUpAdmin(validAdmin)).rejects.toMatchObject({ code: 'ALREADY_SET_UP' });

    await auth.logout();
    expect(await auth.restoreSession()).toBeNull();
    // The superadmin signs in through the teacher form.
    await expect(auth.login({ role: 'teacher', username: 'BOSS', password: 'secret' })).resolves.toEqual(
      session,
    );
    await expect(auth.login({ role: 'student', username: 'boss', password: 'secret' })).rejects.toMatchObject(
      {
        code: 'INVALID_CREDENTIALS',
      },
    );
  });

  it.each([
    [{ ...validAdmin, username: '  ' }, 'USERNAME_REQUIRED'],
    [{ ...validAdmin, username: 'bo ss' }, 'INVALID_USERNAME'],
    [{ ...validAdmin, password: 'abc12', passwordConfirmation: 'abc12' }, 'TEACHER_PASSWORD_TOO_SHORT'],
    [{ ...validAdmin, passwordConfirmation: 'other' }, 'PASSWORDS_MISMATCH'],
  ])('validates the superadmin setup (%#)', async (input, code) => {
    await expect((await setup()).auth.setUpAdmin(input)).rejects.toMatchObject({ code });
  });

  it('signs in a teacher the superadmin created, and their student with the teacher on the session', async () => {
    const { deps, auth, studentService, adminService } = await setup();
    const admin = await auth.setUpAdmin(validAdmin);
    expect(admin.role).toBe('admin');
    const [tariff] = await adminService.listTariffs();
    const { id } = await adminService.createTeacher({
      username: 'nodira',
      password: 'secret1',
      firstName: 'Nodira',
      lastName: '',
      phone: '',
      centerName: '',
      tariffId: tariff.id,
      billingStartsOn: null,
      bonus: 0,
    });

    const teacher = await auth.login({ role: 'teacher', username: 'Nodira', password: 'secret1' });
    expect(teacher).toEqual({ role: 'teacher', teacherId: id });

    const { student } = await studentService.add({
      firstName: 'Ali',
      lastName: '',
      username: 'ali10',
      password: '1234',
    });
    await expect(auth.login({ role: 'student', username: 'Ali10', password: '1234' })).resolves.toEqual({
      role: 'student',
      studentId: student.id,
      teacherId: id,
    });
    await expect(auth.login({ role: 'student', username: 'ali10', password: '9999' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    await expect(auth.login({ role: 'teacher', username: 'ali10', password: '1234' })).rejects.toMatchObject({
      code: 'INVALID_CREDENTIALS',
    });
    await expect(auth.login({ role: 'student', username: '', password: '' })).rejects.toMatchObject({
      code: 'CREDENTIALS_REQUIRED',
    });

    // The other teacher does not see Ali.
    deps.signInAs({ role: 'teacher', teacherId: TEST_TEACHER_ID });
    expect(await studentService.list()).toEqual([]);
  });
});
