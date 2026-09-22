import { AppError } from '@/application/errors';
import type { IdGenerator, StudentRepository } from '@/application/ports';
import type { Student, StudentAccount } from '@/domain/users';
import type { PasswordHasher } from '../security/pbkdf2PasswordHasher';
import type { StudentRecord, StudentRecords } from './studentRecords';

interface Dependencies {
  records: StudentRecords;
  hasher: PasswordHasher;
  generateId: IdGenerator;
}

export function createLocalStudentRepository({
  records,
  hasher,
  generateId,
}: Dependencies): StudentRepository {
  return {
    list: async () => (await records.list()).map(toStudent),

    listAccounts: async () => (await records.list()).map(toAccount),

    async create(student, password) {
      if (await records.findByUsername(student.username)) throw new AppError('USERNAME_TAKEN');
      const record: StudentRecord = {
        ...student,
        id: generateId(),
        passwordHash: await hasher.hash(password),
      };
      await records.save(record);
      return toAccount(record);
    },

    async setPassword(id, password) {
      const record = (await records.list()).find((r) => r.id === id);
      if (!record) throw new AppError('STUDENT_NOT_FOUND');
      await records.save({ ...record, passwordHash: await hasher.hash(password) });
    },

    async updateProfile(id, updates) {
      const record = (await records.list()).find((r) => r.id === id);
      if (!record) throw new AppError('STUDENT_NOT_FOUND');
      await records.save({ ...record, ...updates });
    },

    async touchActive(id) {
      const record = (await records.list()).find((r) => r.id === id);
      if (!record) return;
      await records.save({ ...record, lastActiveAt: new Date().toISOString() });
    },

    remove: (id) => records.remove(id),

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
