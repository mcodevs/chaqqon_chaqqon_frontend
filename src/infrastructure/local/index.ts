import type { Clock, Ports, StorageGateway, TelegramGateway } from '@/application/ports';
import { createPbkdf2PasswordHasher } from '../security/pbkdf2PasswordHasher';
import { createWebStorageStore } from '../storage/webStorageStore';
import { createLocalAuthGateway } from './localAuthGateway';
import { createLocalHomeworkRepository } from './localHomeworkRepository';
import { createLocalPaymentRepository } from './localPaymentRepository';
import {
  createLocalMarketRepository,
  createLocalResultRepository,
  createLocalRoomRepository,
} from './localPracticeRepositories';
import { createLocalPlatform } from './localPlatform';
import {
  createLocalAccountRepository,
  createLocalAdminRepository,
  createLocalPlatformSettingsRepository,
  createLocalTariffRepository,
} from './localPlatformRepositories';
import { createLocalStudentRepository } from './localStudentRepository';
import { createStudentRecords } from './studentRecords';
import { createWebSessionStore } from './webSessionStore';

const STORAGE_NAMESPACE = 'chaqqon:v1';

function createLocalStorageGateway(): StorageGateway {
  /** No server here, so the picture is kept inline as a data URL. */
  const toDataUrl = (file: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  return {
    uploadAvatar: toDataUrl,
    uploadMarketImage: toDataUrl,
  };
}

/** No Telegram bridge in the local backend; the app runs as a plain browser session. */
function createNoopTelegramGateway(): TelegramGateway {
  return {
    isAvailable: () => false,
    link: () => Promise.resolve(),
    unlink: () => Promise.resolve(),
  };
}

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
  const sessions = createWebSessionStore(browser.sessionStorage);
  const platform = createLocalPlatform({ store, records, sessions, clock, generateId });
  const platformDeps = { store, platform, records, hasher, clock, generateId };

  return {
    auth: createLocalAuthGateway({ platform, records, hasher, sessions, generateId }),
    students: createLocalStudentRepository({ records, platform, hasher, generateId }),
    results: createLocalResultRepository(store, platform),
    rooms: createLocalRoomRepository(store, platform),
    payments: createLocalPaymentRepository({ store, records, platform, clock, generateId }),
    market: createLocalMarketRepository(store, platform),
    homework: createLocalHomeworkRepository(store, platform),
    account: createLocalAccountRepository(platformDeps),
    tariffs: createLocalTariffRepository(platformDeps),
    admin: createLocalAdminRepository(platformDeps),
    settings: createLocalPlatformSettingsRepository(platformDeps),
    storage: createLocalStorageGateway(),
    telegram: createNoopTelegramGateway(),
  };
}
