import type { Clock, Ports } from '@/application/ports';
import { createPbkdf2PasswordHasher } from '../security/pbkdf2PasswordHasher';
import { createWebStorageStore } from '../storage/webStorageStore';
import { createLocalAuthGateway } from './localAuthGateway';
import { createLocalPaymentRepository } from './localPaymentRepository';
import { createLocalResultRepository, createLocalRoomRepository } from './localPracticeRepositories';
import { createLocalStudentRepository } from './localStudentRepository';
import { createStudentRecords } from './studentRecords';
import { createWebSessionStore } from './webSessionStore';

const STORAGE_NAMESPACE = 'chaqqon:v1';

/** Backend that lives entirely in this browser (localStorage), for offline use and development. */
export function createLocalPorts(browser: Window, clock: Clock): Ports {
  const store = createWebStorageStore({
    storage: browser.localStorage,
    namespace: STORAGE_NAMESPACE,
    eventTarget: browser,
  });
  const hasher = createPbkdf2PasswordHasher();
  const records = createStudentRecords(store);
  const generateId = () => crypto.randomUUID();

  return {
    auth: createLocalAuthGateway({
      store,
      records,
      hasher,
      sessions: createWebSessionStore(browser.sessionStorage),
    }),
    students: createLocalStudentRepository({ records, hasher, generateId }),
    results: createLocalResultRepository(store),
    rooms: createLocalRoomRepository(store),
    payments: createLocalPaymentRepository({ store, records, clock, generateId }),
  };
}
