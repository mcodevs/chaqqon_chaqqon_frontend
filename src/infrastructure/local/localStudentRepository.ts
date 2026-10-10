import { AppError } from '@/application/errors';
import type { IdGenerator, StudentRepository } from '@/application/ports';
import { canAddStudent } from '@/domain/teacherBilling';
import type { Student, StudentAccount } from '@/domain/users';
import type { PasswordHasher } from '../security/pbkdf2PasswordHasher';
import type { LocalPlatform } from './localPlatform';
import type { StudentRecord, StudentRecords } from './studentRecords';

interface Dependencies {
  records: StudentRecords;
  platform: LocalPlatform;
  hasher: PasswordHasher;
  generateId: IdGenerator;
}

export function createLocalStudentRepository({
  records,
  platform,
  hasher,
  generateId,
}: Dependencies): StudentRepository {
  /** The caller's class: a teacher's students, or a student's classmates. */
  const visible = async () => {
    const ids = await platform.visibleStudentIds();
    return (await records.list()).filter((record) => ids.has(record.id));
  };

  /** One of the calling teacher's own students, or STUDENT_NOT_FOUND. */
  const own = async (id: string) => {
    const ids = await platform.ownStudentIds();
    const record = (await records.list()).find((r) => r.id === id && ids.has(r.id));
    if (!record) throw new AppError('STUDENT_NOT_FOUND');
    return record;
  };

  return {
    list: async () => (await visible()).map(toStudent),

    listAccounts: async () => {
      const ids = await platform.ownStudentIds();
      return (await records.list()).filter((r) => ids.has(r.id)).map(toAccount);
    },

    async create(student, password) {
      await platform.assertCanManage();
      const teacherId = platform.myTeacherId();
      if (!teacherId) throw new AppError('FORBIDDEN');
      if (await platform.isUsernameTaken(student.username)) throw new AppError('USERNAME_TAKEN');

      const teacher = (await platform.listTeachers()).find((t) => t.id === teacherId);
      const tariff = (await platform.listTariffs()).find((t) => t.id === teacher?.tariffId);
      const count = (await platform.ownStudentIds()).size;
      if (!canAddStudent(count, tariff?.maxStudents ?? null)) throw new AppError('STUDENT_LIMIT');

      const record: StudentRecord = {
        ...student,
        id: generateId(),
        passwordHash: await hasher.hash(password),
        teacherId,
        createdAt: new Date().toISOString(),
      };
      await records.save(record);
      return toAccount(record);
    },

    async setPassword(id, password) {
      await platform.assertCanManage();
      const record = await own(id);
      await records.save({ ...record, passwordHash: await hasher.hash(password) });
    },

    async updateProfile(id, updates) {
      const current = platform.session();
      // A student changes their own picture; everything else is the teacher's.
      if (current?.role === 'student' && current.studentId === id) {
        const record = (await records.list()).find((r) => r.id === id);
        if (!record) throw new AppError('STUDENT_NOT_FOUND');
        await records.save({ ...record, avatarUrl: updates.avatarUrl ?? record.avatarUrl });
        return;
      }
      await platform.assertCanManage();
      const record = await own(id);
      await records.save({ ...record, ...updates });
    },

    async touchActive(id) {
      const record = (await records.list()).find((r) => r.id === id);
      if (!record) return;
      await records.save({ ...record, lastActiveAt: new Date().toISOString() });
    },

    async remove(id) {
      await platform.assertCanManage();
      await own(id);
      await records.remove(id);
    },

    subscribe: (listener) => records.subscribe(listener),
  };
}

function toStudent(record: StudentRecord): Student {
  return {
    id: record.id,
    firstName: record.firstName,
    lastName: record.lastName,
    birthYear: record.birthYear ?? null,
    levelGroup: record.levelGroup ?? 'A',
    avatarUrl: record.avatarUrl ?? null,
    lastActiveAt: record.lastActiveAt ?? null,
  };
}

function toAccount(record: StudentRecord): StudentAccount {
  return { ...toStudent(record), username: record.username };
}
