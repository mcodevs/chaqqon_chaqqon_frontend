import type { HomeworkRepository } from '@/application/ports';
import type { HomeworkStatus, WrittenHomework } from '@/domain/homework';
import { AppError } from '@/application/errors';
import { type KeyValueStore, keyMatches } from '../storage/keyValueStore';
import type { LocalPlatform } from './localPlatform';

const KEY = 'written_homework';

export function createLocalHomeworkRepository(
  store: KeyValueStore,
  platform: LocalPlatform,
): HomeworkRepository {
  const list = async (): Promise<WrittenHomework[]> => (await store.get<WrittenHomework[]>(KEY)) ?? [];

  return {
    /** A teacher sees their students' homework, a student only their own. */
    async list() {
      const current = platform.session();
      const all = await list();
      if (current?.role === 'student') return all.filter((h) => h.studentId === current.studentId);
      const own = await platform.ownStudentIds();
      return all.filter((h) => own.has(h.studentId));
    },

    async setStatus(
      studentId: string,
      date: string,
      status: HomeworkStatus,
      notes = '',
    ): Promise<WrittenHomework> {
      await platform.assertCanManage();
      if (!(await platform.ownStudentIds()).has(studentId)) throw new AppError('STUDENT_NOT_FOUND');
      const items = await list();
      const existingIndex = items.findIndex((h) => h.studentId === studentId && h.date === date);
      const updated: WrittenHomework = {
        id: existingIndex !== -1 ? items[existingIndex].id : crypto.randomUUID(),
        studentId,
        date,
        status,
        notes,
        updatedAt: new Date().toISOString(),
      };

      const next = existingIndex !== -1 ? items.with(existingIndex, updated) : [updated, ...items];
      await store.set(KEY, next);
      return updated;
    },

    subscribe: (listener) => store.subscribe((key) => keyMatches(key, (k) => k === KEY) && listener()),
  };
}
