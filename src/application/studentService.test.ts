import { describe, expect, it } from 'vitest';
import { createTestDependencies, fakeHasher } from '@/testing/fakes';
import { createStudentService } from './studentService';

const input = { firstName: ' Ali ', lastName: 'Valiyev', age: 8, username: 'Ali10', password: '1234' };

describe('studentService', () => {
  it('adds a student and returns the plain credentials once', async () => {
    const deps = createTestDependencies();
    const service = createStudentService(deps);

    const { student, credentials } = await service.add(input);

    expect(student).toMatchObject({ firstName: 'Ali', username: 'ali10' });
    expect(credentials).toEqual({ username: 'ali10', password: '1234' });
    expect((await deps.records.list())[0].passwordHash).not.toContain('1234$');
  });

  it('shows usernames only in the account list', async () => {
    const service = createStudentService(createTestDependencies());
    await service.add(input);

    const [publicProfile] = await service.list();
    expect(publicProfile).not.toHaveProperty('username');
    expect((await service.listAccounts())[0].username).toBe('ali10');
  });

  it('rejects duplicate usernames case-insensitively', async () => {
    const service = createStudentService(createTestDependencies());
    await service.add(input);
    await expect(service.add({ ...input, username: 'ALI10' })).rejects.toMatchObject({
      code: 'USERNAME_TAKEN',
    });
  });

  it.each([
    [{ ...input, firstName: ' ' }, 'STUDENT_FIELDS_REQUIRED'],
    [{ ...input, username: 'ali 10' }, 'INVALID_USERNAME'],
    [{ ...input, password: '12' }, 'PASSWORD_TOO_SHORT'],
    [{ ...input, age: 1.5 }, 'INVALID_AGE'],
  ])('validates new students (%#)', async (invalid, code) => {
    const service = createStudentService(createTestDependencies());
    await expect(service.add(invalid)).rejects.toMatchObject({ code });
  });

  it('issues a new password that replaces the old one', async () => {
    const deps = createTestDependencies();
    const service = createStudentService(deps);
    const { student } = await service.add(input);

    const credentials = await service.resetPassword(student.id);
    const [record] = await deps.records.list();

    expect(credentials.username).toBe('ali10');
    expect(await fakeHasher.verify(credentials.password, record.passwordHash)).toBe(true);
    await expect(service.resetPassword('missing')).rejects.toMatchObject({ code: 'STUDENT_NOT_FOUND' });
  });

  it('suggests valid latin usernames and 4-digit passwords', () => {
    const service = createStudentService(createTestDependencies());
    const suggestion = service.suggestCredentials("G'ayrat");
    expect(suggestion.username).toMatch(/^gayrat\d{2}$/);
    expect(suggestion.password).toMatch(/^\d{4}$/);
  });
});
