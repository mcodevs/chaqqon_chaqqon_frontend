import { describe, expect, it } from 'vitest';
import { addDays, schoolDate } from '@/domain/billing';
import { TEST_TEACHER_ID, createTestDependencies, fakeHasher } from '@/testing/fakes';
import { createLocalPlatform } from './localPlatform';

describe('the browser-only platform', () => {
  it("hands the single-teacher app's data to that teacher, who can still sign in", async () => {
    const deps = await createTestDependencies();
    // A browser that used the app before the platform: one teacher key, students and a room without owners.
    await deps.store.set('teacher', { username: 'mohira', passwordHash: await fakeHasher.hash('secret') });
    await deps.store.set('students', [
      {
        id: 's1',
        username: 'ali10',
        firstName: 'Ali',
        lastName: '',
        passwordHash: await fakeHasher.hash('1234'),
      },
    ]);
    await deps.store.set('rooms/all', [
      { id: 'r1', status: 'finished', participantIds: ['s1'], configs: {}, createdAt: '' },
    ]);
    await deps.store.set('platform/teachers', []);

    const platform = createLocalPlatform({
      store: deps.store,
      records: deps.records,
      sessions: { load: () => null, save: () => {} },
      clock: deps.clock,
      generateId: () => 'old-teacher',
    });
    await platform.ready();

    expect((await platform.listTeachers()).map((t) => [t.id, t.username])).toEqual([
      ['old-teacher', 'mohira'],
    ]);
    expect((await deps.records.list())[0].teacherId).toBe('old-teacher');
    expect(await deps.store.get<{ teacherId: string }[]>('rooms/all')).toMatchObject([
      { teacherId: 'old-teacher' },
    ]);
    expect(await deps.store.get('teacher')).toBeNull();
  });

  it('keeps a teacher to the student limit of their tariff', async () => {
    const deps = await createTestDependencies();
    const [legacy] = await deps.platform.listTariffs();
    await deps.platform.saveTariffs([{ ...legacy, maxStudents: 1 }]);

    await deps.students.create({ firstName: 'Ali', lastName: '', username: 'ali10' }, '1234');
    await expect(
      deps.students.create({ firstName: 'Vali', lastName: '', username: 'vali20' }, '1234'),
    ).rejects.toMatchObject({
      code: 'STUDENT_LIMIT',
    });
  });

  it('closes management for a teacher a week into a debt, until the admin records the payment', async () => {
    const deps = await createTestDependencies();
    const [legacy] = await deps.platform.listTariffs();
    await deps.platform.saveTariffs([{ ...legacy, monthlyPrice: 100_000 }]);
    const [teacher] = await deps.platform.listTeachers();
    await deps.platform.saveTeachers([
      { ...teacher, billingStartsOn: addDays(schoolDate(deps.clock.now()), -10) },
    ]);

    await expect(
      deps.students.create({ firstName: 'Ali', lastName: '', username: 'ali10' }, '1234'),
    ).rejects.toMatchObject({
      code: 'TEACHER_BLOCKED',
    });

    deps.signInAs({ role: 'admin', adminId: 'boss' });
    await deps.admin.recordLedgerEntry(TEST_TEACHER_ID, 'payment', 100_000, 'naqd');
    deps.signInAs({ role: 'teacher', teacherId: TEST_TEACHER_ID });

    await deps.students.create({ firstName: 'Ali', lastName: '', username: 'ali10' }, '1234');
    expect((await deps.account.myTeacherAccount()).ledger.map((entry) => entry.kind)).toEqual([
      'charge',
      'payment',
    ]);
  });

  it("keeps each teacher's class and shop apart", async () => {
    const deps = await createTestDependencies();
    await deps.students.create({ firstName: 'Ali', lastName: '', username: 'ali10' }, '1234');
    await deps.market.saveItem({
      id: 'i1',
      title: 'Ruchka',
      costStars: 1,
      imageUrl: '🖊',
      stock: null,
      createdAt: '',
    });

    const [first] = await deps.platform.listTeachers();
    await deps.platform.saveTeachers([first, { ...first, id: 'teacher-2', username: 'other' }]);
    deps.signInAs({ role: 'teacher', teacherId: 'teacher-2' });

    expect(await deps.students.list()).toEqual([]);
    expect(await deps.market.listItems()).toEqual([]);
    await expect(deps.students.remove((await deps.records.list())[0].id)).rejects.toMatchObject({
      code: 'STUDENT_NOT_FOUND',
    });
  });
});
