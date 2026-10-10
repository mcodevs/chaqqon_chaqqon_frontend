import { AppError } from '@/application/errors';
import type { ChangeListener, Clock, IdGenerator, PlatformSettings, Unsubscribe } from '@/application/ports';
import type { Session } from '@/application/session';
import { schoolDate } from '@/domain/billing';
import {
  FEATURES,
  type Feature,
  type LedgerEntry,
  type Tariff,
  type TeacherBillingState,
  dueCharges,
  isLocked,
  teacherBillingState,
} from '@/domain/teacherBilling';
import { normalizeUsername } from '@/domain/users';
import { type KeyValueStore, keyMatches } from '../storage/keyValueStore';
import type { StudentRecords } from './studentRecords';
import type { SessionStore } from './webSessionStore';

/*
 * The browser-only backend plays the platform's rules the way the database does: who may see
 * which class, the tariffs, and the teacher's ledger. It is a development tool, not a security
 * boundary; every rule here exists so the app behaves as it does on Supabase.
 */

export interface AdminRecord {
  id: string;
  username: string;
  passwordHash: string;
}

export interface TeacherRecord {
  id: string;
  username: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string;
  centerName: string;
  tariffId: string;
  billingStartsOn: string | null;
  disabledAt: string | null;
  createdAt: string;
}

export const PLATFORM_KEYS = {
  admin: 'platform/admin',
  teachers: 'platform/teachers',
  tariffs: 'platform/tariffs',
  ledger: 'platform/ledger',
  settings: 'platform/settings',
  prefix: 'platform/',
} as const;

/** Where the single-teacher app kept its data, so a browser that used it carries on. */
const LEGACY_KEYS = { teacher: 'teacher', rooms: 'rooms/all', items: 'market/items' } as const;

const LEGACY_TARIFF_NAME = 'Legacy';

interface Dependencies {
  store: KeyValueStore;
  records: StudentRecords;
  sessions: SessionStore;
  clock: Clock;
  generateId: IdGenerator;
}

export function createLocalPlatform({ store, records, sessions, clock, generateId }: Dependencies) {
  const getAdmin = () => store.get<AdminRecord>(PLATFORM_KEYS.admin);
  const listTeachers = async () => (await store.get<TeacherRecord[]>(PLATFORM_KEYS.teachers)) ?? [];
  const listTariffs = async () => (await store.get<Tariff[]>(PLATFORM_KEYS.tariffs)) ?? [];
  const storedLedger = async () => (await store.get<LedgerEntry[]>(PLATFORM_KEYS.ledger)) ?? [];
  const today = () => schoolDate(clock.now());

  /**
   * One free tariff with every section, and the old single teacher with their students, rooms and
   * shop: the same hand-over the platform migration does on Supabase.
   */
  async function migrate(): Promise<void> {
    let tariffs = await listTariffs();
    let legacy = tariffs.find((tariff) => tariff.name === LEGACY_TARIFF_NAME);
    if (!legacy) {
      legacy = {
        id: generateId(),
        name: LEGACY_TARIFF_NAME,
        monthlyPrice: 0,
        maxStudents: null,
        features: [...FEATURES],
        description: 'Platformadan oldingi ustoz uchun',
        isPublic: false,
        sortOrder: 999,
        archivedAt: null,
      };
      tariffs = [...tariffs, legacy];
      await store.set(PLATFORM_KEYS.tariffs, tariffs);
    }

    const old = await store.get<{ username: string; passwordHash: string }>(LEGACY_KEYS.teacher);
    if (!old) return;

    const teacherId = generateId();
    await store.set<TeacherRecord[]>(PLATFORM_KEYS.teachers, [
      ...(await listTeachers()),
      {
        id: teacherId,
        username: old.username,
        passwordHash: old.passwordHash,
        firstName: '',
        lastName: '',
        phone: '',
        centerName: '',
        tariffId: legacy.id,
        billingStartsOn: null,
        disabledAt: null,
        createdAt: clock.now().toISOString(),
      },
    ]);
    for (const record of await records.list()) {
      if (!record.teacherId) await records.save({ ...record, teacherId });
    }
    for (const key of [LEGACY_KEYS.rooms, LEGACY_KEYS.items]) {
      const rows = await store.get<{ teacherId?: string }[]>(key);
      if (rows)
        await store.set(
          key,
          rows.map((row) => ({ ...row, teacherId: row.teacherId ?? teacherId })),
        );
    }
    await store.remove(LEGACY_KEYS.teacher);
  }

  let migration: Promise<void> | null = null;

  const session = (): Session | null => sessions.load();

  /** The class the caller belongs to: a teacher's own, a student's teacher's. */
  const myTeacherId = (): string | null => {
    const current = session();
    return current?.role === 'teacher' || current?.role === 'student' ? current.teacherId : null;
  };

  /**
   * Fees that fell due are written into the ledger when it is read, at the tariff's price of the
   * day, as the database's nightly job and lazy catch-up do.
   */
  async function ledger(): Promise<LedgerEntry[]> {
    const [entries, teachers, tariffs] = await Promise.all([storedLedger(), listTeachers(), listTariffs()]);
    const added: LedgerEntry[] = [];
    for (const teacher of teachers) {
      const tariff = tariffs.find((t) => t.id === teacher.tariffId);
      if (!tariff || teacher.disabledAt) continue;
      const own = entries.filter((entry) => entry.teacherId === teacher.id);
      for (const charge of dueCharges(teacher.id, teacher.billingStartsOn, tariff, own, today())) {
        added.push({ ...charge, id: generateId(), createdAt: clock.now().toISOString() });
      }
    }
    if (added.length === 0) return entries;
    const next = [...entries, ...added];
    await store.set(PLATFORM_KEYS.ledger, next);
    return next;
  }

  async function teacherState(teacherId: string): Promise<TeacherBillingState | null> {
    const teacher = (await listTeachers()).find((t) => t.id === teacherId);
    if (!teacher) return null;
    const tariff = (await listTariffs()).find((t) => t.id === teacher.tariffId);
    return teacherBillingState({
      entries: (await ledger()).filter((entry) => entry.teacherId === teacherId),
      anchor: teacher.billingStartsOn,
      monthlyPrice: tariff?.monthlyPrice ?? 0,
      disabled: teacher.disabledAt !== null,
      today: today(),
    });
  }

  async function featuresOf(teacherId: string | null): Promise<Feature[]> {
    if (!teacherId) return [];
    const teacher = (await listTeachers()).find((t) => t.id === teacherId);
    return (await listTariffs()).find((t) => t.id === teacher?.tariffId)?.features ?? [];
  }

  return {
    ready: () => (migration ??= migrate()),
    session,
    myTeacherId,
    getAdmin,
    saveAdmin: (admin: AdminRecord) => store.set(PLATFORM_KEYS.admin, admin),
    listTeachers,
    saveTeachers: (teachers: TeacherRecord[]) => store.set(PLATFORM_KEYS.teachers, teachers),
    listTariffs,
    saveTariffs: (tariffs: Tariff[]) => store.set(PLATFORM_KEYS.tariffs, tariffs),
    ledger,
    saveLedger: (entries: LedgerEntry[]) => store.set(PLATFORM_KEYS.ledger, entries),
    teacherState,
    featuresOf,

    async isUsernameTaken(username: string): Promise<boolean> {
      const name = normalizeUsername(username);
      const admin = await getAdmin();
      if (admin && normalizeUsername(admin.username) === name) return true;
      if ((await listTeachers()).some((t) => normalizeUsername(t.username) === name)) return true;
      return (await records.findByUsername(name)) !== null;
    },

    /** Students the caller may see: a teacher's class, or a student's classmates. */
    async visibleStudentIds(): Promise<Set<string>> {
      const teacherId = myTeacherId();
      return new Set(
        (await records.list()).filter((r) => teacherId && r.teacherId === teacherId).map((r) => r.id),
      );
    },

    /** The calling teacher's own students; nobody's for anyone else. */
    async ownStudentIds(): Promise<Set<string>> {
      const current = session();
      if (current?.role !== 'teacher') return new Set();
      return new Set(
        (await records.list()).filter((r) => r.teacherId === current.teacherId).map((r) => r.id),
      );
    },

    /** Management is closed while the calling teacher is blocked or disabled. */
    async assertCanManage(): Promise<void> {
      const current = session();
      if (current?.role !== 'teacher') throw new AppError('FORBIDDEN');
      const state = await teacherState(current.teacherId);
      if (state && isLocked(state.status)) throw new AppError('TEACHER_BLOCKED');
    },

    async getSettings(): Promise<PlatformSettings> {
      return (
        (await store.get<PlatformSettings>(PLATFORM_KEYS.settings)) ?? {
          contactPhone: '',
          contactTelegram: '',
        }
      );
    },
    saveSettings: (settings: PlatformSettings) => store.set(PLATFORM_KEYS.settings, settings),

    subscribe: (listener: ChangeListener): Unsubscribe =>
      store.subscribe((key) => keyMatches(key, (k) => k.startsWith(PLATFORM_KEYS.prefix)) && listener()),
  };
}

export type LocalPlatform = ReturnType<typeof createLocalPlatform>;
