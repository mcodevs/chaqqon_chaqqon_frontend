import type { HomeworkRepository } from '@/application/ports';
import type { HomeworkStatus, WrittenHomework } from '@/domain/homework';
import { type KeyValueStore, keyMatches } from '../storage/keyValueStore';

const KEY = 'written_homework';

export function createLocalHomeworkRepository(store: KeyValueStore): HomeworkRepository {
  const list = async (): Promise<WrittenHomework[]> => (await store.get<WrittenHomework[]>(KEY)) ?? [];

  return {
    list,

    async setStatus(studentId: string, date: string, status: HomeworkStatus, notes = ''): Promise<WrittenHomework> {
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
