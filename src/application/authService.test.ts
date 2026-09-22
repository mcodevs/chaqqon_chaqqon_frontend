import { describe, expect, it } from 'vitest';
import { createTestDependencies } from '@/testing/fakes';
import { createAuthService } from './authService';
import { createStudentService } from './studentService';

function setup() {
  const deps = createTestDependencies();
  return { auth: createAuthService(deps), studentService: createStudentService(deps) };
}

const validTeacher = { username: ' Mohira ', password: 'secret', passwordConfirmation: 'secret' };

describe('authService', () => {
  it('registers the teacher once, keeps the session and logs out', async () => {
    const { auth } = setup();
    expect(await auth.hasTeacher()).toBe(false);

    await expect(auth.registerTeacher(validTeacher)).resolves.toEqual({ role: 'teacher' });
    expect(await auth.hasTeacher()).toBe(true);
    expect(await auth.restoreSession()).toEqual({ role: 'teacher' });
    await expect(auth.registerTeacher(validTeacher)).rejects.toMatchObject({ code: 'TEACHER_EXISTS' });

    await auth.logout();
    expect(await auth.restoreSession()).toBeNull();
    await expect(auth.login({ role: 'teacher', username: 'MOHIRA', password: 'secret' })).resolves.toEqual({
      role: 'teacher',
    });
  });

  it.each([
    [{ ...validTeacher, username: '  ' }, 'USERNAME_REQUIRED'],
    [{ ...validTeacher, username: 'mo hira' }, 'INVALID_USERNAME'],
    [{ ...validTeacher, password: 'abc', passwordConfirmation: 'abc' }, 'PASSWORD_TOO_SHORT'],
    [{ ...validTeacher, passwordConfirmation: 'other' }, 'PASSWORDS_MISMATCH'],
  ])('validates teacher registration (%#)', async (input, code) => {
    await expect(setup().auth.registerTeacher(input)).rejects.toMatchObject({ code });
  });

  it('logs a student in and rejects wrong credentials', async () => {
    const { auth, studentService } = setup();
    const { student } = await studentService.add({
      firstName: 'Ali',
      lastName: '',
      username: 'ali10',
      password: '1234',
    });

    await expect(auth.login({ role: 'student', username: 'Ali10', password: '1234' })).resolves.toEqual({
      role: 'student',
      studentId: student.id,
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
  });
});
