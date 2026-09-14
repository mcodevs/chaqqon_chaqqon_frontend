import type { Clock } from '@/application/ports';
import { createSeededRandom } from '@/domain/random';
import { createLocalAuthGateway } from '@/infrastructure/local/localAuthGateway';
import { createLocalPaymentRepository } from '@/infrastructure/local/localPaymentRepository';
import {
  createLocalResultRepository,
  createLocalRoomRepository,
} from '@/infrastructure/local/localPracticeRepositories';
import { createLocalStudentRepository } from '@/infrastructure/local/localStudentRepository';
import { createStudentRecords } from '@/infrastructure/local/studentRecords';
import { createMemorySessionStore } from '@/infrastructure/local/webSessionStore';
import type { PasswordHasher } from '@/infrastructure/security/pbkdf2PasswordHasher';
import { createMemoryStore } from '@/infrastructure/storage/memoryStore';

/** Reversible stand-in so service tests stay fast; the real hasher has its own test. */
export const fakeHasher: PasswordHasher = {
  hash: async (password) => `hashed:${password}`,
  verify: async (password, hash) => hash === `hashed:${password}`,
};

/** In-memory local backend wired the same way as in the app. */
export function createTestDependencies() {
  const store = createMemoryStore();
  const records = createStudentRecords(store);
  let idCounter = 0;
  const generateId = () => `id-${++idCounter}`;
  const clock: Clock = { now: () => new Date('2026-09-13T10:00:00.000Z') };

  return {
    records,
    gateway: createLocalAuthGateway({
      store,
      records,
      hasher: fakeHasher,
      sessions: createMemorySessionStore(),
    }),
    students: createLocalStudentRepository({ records, hasher: fakeHasher, generateId }),
    results: createLocalResultRepository(store),
    rooms: createLocalRoomRepository(store),
    payments: createLocalPaymentRepository({ store, records, clock, generateId }),
    generateId,
    clock,
    random: createSeededRandom(1),
  };
}
