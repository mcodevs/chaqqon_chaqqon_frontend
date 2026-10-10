import type { Clock } from '@/application/ports';
import type { Session } from '@/application/session';
import { createSeededRandom } from '@/domain/random';
import { createLocalAuthGateway } from '@/infrastructure/local/localAuthGateway';
import { createLocalPaymentRepository } from '@/infrastructure/local/localPaymentRepository';
import { createLocalPlatform } from '@/infrastructure/local/localPlatform';
import {
  createLocalAccountRepository,
  createLocalAdminRepository,
  createLocalApplicationRepository,
  createLocalPlatformSettingsRepository,
  createLocalTariffRepository,
} from '@/infrastructure/local/localPlatformRepositories';
import {
  createLocalMarketRepository,
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

/** The teacher the service tests act as unless they sign in as someone else. */
export const TEST_TEACHER_ID = 'teacher-1';

/**
 * In-memory local backend wired the same way as in the app. It starts with one teacher on the
 * free legacy tariff, signed in, so tests of the teacher's tools can start right away.
 */
export async function createTestDependencies() {
  const store = createMemoryStore();
  const records = createStudentRecords(store);
  let idCounter = 0;
  const generateId = () => `id-${++idCounter}`;
  const clock: Clock = { now: () => new Date('2026-09-13T10:00:00.000Z') };
  const sessions = createMemorySessionStore();
  const platform = createLocalPlatform({ store, records, sessions, clock, generateId });
  const platformDeps = { store, platform, records, hasher: fakeHasher, clock, generateId };

  await platform.ready();
  const [legacy] = await platform.listTariffs();
  await platform.saveTeachers([
    {
      id: TEST_TEACHER_ID,
      username: 'ustoz',
      passwordHash: await fakeHasher.hash('secret'),
      firstName: 'Ustoz',
      lastName: '',
      phone: '',
      centerName: '',
      tariffId: legacy.id,
      billingStartsOn: null,
      disabledAt: null,
      createdAt: clock.now().toISOString(),
    },
  ]);
  sessions.save({ role: 'teacher', teacherId: TEST_TEACHER_ID });

  return {
    store,
    records,
    platform,
    signInAs: (session: Session | null) => sessions.save(session),
    /** Puts students with these ids into the test teacher's class, for tests that only need ids. */
    async enrol(...ids: string[]) {
      for (const id of ids) {
        await records.save({
          id,
          username: `s-${id}`,
          firstName: id,
          lastName: '',
          passwordHash: await fakeHasher.hash('1234'),
          teacherId: TEST_TEACHER_ID,
        });
      }
    },
    gateway: createLocalAuthGateway({ platform, records, hasher: fakeHasher, sessions, generateId }),
    students: createLocalStudentRepository({ records, platform, hasher: fakeHasher, generateId }),
    results: createLocalResultRepository(store, platform),
    rooms: createLocalRoomRepository(store, platform),
    payments: createLocalPaymentRepository({ store, records, platform, clock, generateId }),
    market: createLocalMarketRepository(store, platform),
    account: createLocalAccountRepository(platformDeps),
    tariffs: createLocalTariffRepository(platformDeps),
    admin: createLocalAdminRepository(platformDeps),
    settings: createLocalPlatformSettingsRepository(platformDeps),
    applications: createLocalApplicationRepository(platformDeps),
    generateId,
    clock,
    random: createSeededRandom(1),
  };
}
