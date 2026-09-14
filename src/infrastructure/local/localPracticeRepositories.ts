import type { ResultRepository, RoomRepository } from '@/application/ports';
import type { Room, RoomProgress } from '@/domain/competition';
import { type PracticeResult, resolvePracticeMode } from '@/domain/results';
import { type KeyValueStore, keyMatches } from '../storage/keyValueStore';

const KEYS = {
  results: 'results',
  currentRoom: 'rooms/current',
  roomsPrefix: 'rooms/',
  progressPrefix: (roomId: string) => `rooms/progress/${roomId}/`,
} as const;

export function createLocalResultRepository(store: KeyValueStore): ResultRepository {
  const list = async (): Promise<PracticeResult[]> => {
    const stored = (await store.get<PracticeResult[]>(KEYS.results)) ?? [];
    return stored.map((result) => ({
      ...result,
      mode: resolvePracticeMode(result.mode, result.roomId ?? null),
    }));
  };

  return {
    list,
    async add(results) {
      await store.set(KEYS.results, [...(await list()), ...results]);
    },
    subscribe: (listener) =>
      store.subscribe((key) => keyMatches(key, (k) => k === KEYS.results) && listener()),
  };
}

export function createLocalRoomRepository(store: KeyValueStore): RoomRepository {
  return {
    getCurrent: () => store.get<Room>(KEYS.currentRoom),
    saveCurrent: (room) => store.set(KEYS.currentRoom, room),
    async listProgress(roomId) {
      const keys = await store.keys(KEYS.progressPrefix(roomId));
      const entries = await Promise.all(keys.map((key) => store.get<RoomProgress>(key)));
      return entries.filter((entry): entry is RoomProgress => entry !== null);
    },
    saveProgress: (progress) =>
      store.set(`${KEYS.progressPrefix(progress.roomId)}${progress.studentId}`, progress),
    subscribe: (listener) =>
      store.subscribe((key) => keyMatches(key, (k) => k.startsWith(KEYS.roomsPrefix)) && listener()),
  };
}
