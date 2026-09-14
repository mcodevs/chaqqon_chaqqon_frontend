import type { ChangeListener, Unsubscribe } from '@/application/ports';
import { type StudentAccount, normalizeUsername } from '@/domain/users';
import { type KeyValueStore, keyMatches } from '../storage/keyValueStore';

/** Local persistence shape: the account plus its password hash, which never leaves this module family. */
export interface StudentRecord extends StudentAccount {
  passwordHash: string;
}

const KEY = 'students';

export function createStudentRecords(store: KeyValueStore) {
  const list = async (): Promise<StudentRecord[]> => (await store.get<StudentRecord[]>(KEY)) ?? [];

  return {
    list,

    async findByUsername(username: string): Promise<StudentRecord | null> {
      return (await list()).find((record) => normalizeUsername(record.username) === username) ?? null;
    },

    async save(record: StudentRecord): Promise<void> {
      const records = await list();
      const index = records.findIndex((r) => r.id === record.id);
      await store.set(KEY, index === -1 ? [...records, record] : records.with(index, record));
    },

    async remove(id: string): Promise<void> {
      await store.set(
        KEY,
        (await list()).filter((record) => record.id !== id),
      );
    },

    subscribe: (listener: ChangeListener): Unsubscribe =>
      store.subscribe((key) => keyMatches(key, (k) => k === KEY) && listener()),
  };
}

export type StudentRecords = ReturnType<typeof createStudentRecords>;
