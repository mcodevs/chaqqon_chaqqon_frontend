import { AppError } from '@/application/errors';
import type {
  AccountRepository,
  AdminRepository,
  ApplicationRepository,
  Clock,
  IdGenerator,
  PlatformSettingsRepository,
  TariffRepository,
} from '@/application/ports';
import type { TeacherApplication } from '@/domain/applications';
import { type Payment, accessOf, schoolDate } from '@/domain/billing';
import type { Room } from '@/domain/competition';
import type { TeacherOverview } from '@/domain/platformStats';
import type { PracticeResult } from '@/domain/results';
import { FEATURES, type Tariff } from '@/domain/teacherBilling';
import type { PasswordHasher } from '../security/pbkdf2PasswordHasher';
import type { KeyValueStore } from '../storage/keyValueStore';
import type { LocalPlatform } from './localPlatform';
import type { StudentRecords } from './studentRecords';

interface Dependencies {
  store: KeyValueStore;
  platform: LocalPlatform;
  records: StudentRecords;
  hasher: PasswordHasher;
  clock: Clock;
  generateId: IdGenerator;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function requireAdmin(platform: LocalPlatform) {
  if (platform.session()?.role !== 'admin') throw new AppError('FORBIDDEN');
}

export function createLocalAccountRepository({ platform, records }: Dependencies): AccountRepository {
  const me = async () => {
    const current = platform.session();
    if (current?.role !== 'teacher') throw new AppError('FORBIDDEN');
    const teacher = (await platform.listTeachers()).find((t) => t.id === current.teacherId);
    if (!teacher) throw new AppError('TEACHER_NOT_FOUND');
    return teacher;
  };

  return {
    async myTeacherAccount() {
      const teacher = await me();
      const tariff = (await platform.listTariffs()).find((t) => t.id === teacher.tariffId);
      if (!tariff) throw new AppError('TARIFF_NOT_FOUND');
      return {
        username: teacher.username,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        phone: teacher.phone,
        centerName: teacher.centerName,
        billingStartsOn: teacher.billingStartsOn,
        disabledAt: teacher.disabledAt,
        tariff,
        studentCount: (await records.list()).filter((r) => r.teacherId === teacher.id).length,
        ledger: (await platform.ledger()).filter((entry) => entry.teacherId === teacher.id),
      };
    },

    async updateMyTeacherProfile(profile) {
      const teacher = await me();
      const teachers = await platform.listTeachers();
      await platform.saveTeachers(teachers.map((t) => (t.id === teacher.id ? { ...t, ...profile } : t)));
    },

    async myFeatures() {
      const current = platform.session();
      if (current?.role === 'admin') return [...FEATURES];
      return platform.featuresOf(platform.myTeacherId());
    },

    async myTeacherCard() {
      const teacher = (await platform.listTeachers()).find((t) => t.id === platform.myTeacherId());
      return teacher
        ? {
            firstName: teacher.firstName,
            lastName: teacher.lastName,
            centerName: teacher.centerName,
            phone: teacher.phone,
          }
        : null;
    },

    subscribe: platform.subscribe,
  };
}

export function createLocalTariffRepository({ platform, generateId }: Dependencies): TariffRepository {
  const toTariff = (
    id: string,
    input: Parameters<TariffRepository['create']>[0],
    archivedAt: string | null,
  ): Tariff => ({
    id,
    name: input.name,
    monthlyPrice: input.monthlyPrice,
    maxStudents: input.maxStudents,
    features: input.features,
    description: input.description,
    isPublic: input.isPublic,
    sortOrder: input.sortOrder,
    archivedAt,
  });

  const sorted = (tariffs: Tariff[]) =>
    tariffs.toSorted((a, b) => a.sortOrder - b.sortOrder || a.monthlyPrice - b.monthlyPrice);

  return {
    listOffered: async () =>
      sorted((await platform.listTariffs()).filter((t) => t.isPublic && !t.archivedAt)),

    async listAll() {
      requireAdmin(platform);
      return sorted(await platform.listTariffs());
    },

    async create(input) {
      requireAdmin(platform);
      await platform.saveTariffs([...(await platform.listTariffs()), toTariff(generateId(), input, null)]);
    },

    async update(id, input) {
      requireAdmin(platform);
      const tariffs = await platform.listTariffs();
      await platform.saveTariffs(
        tariffs.map((t) =>
          t.id === id
            ? toTariff(id, input, input.archived ? (t.archivedAt ?? new Date().toISOString()) : null)
            : t,
        ),
      );
    },

    subscribe: platform.subscribe,
  };
}

export function createLocalAdminRepository({
  store,
  platform,
  records,
  hasher,
  clock,
  generateId,
}: Dependencies): AdminRepository {
  return {
    async listTeachers(range) {
      requireAdmin(platform);
      const [teachers, students, results, rooms, payments] = await Promise.all([
        platform.listTeachers(),
        records.list(),
        store.get<PracticeResult[]>('results'),
        store.get<(Room & { teacherId?: string })[]>('rooms/all'),
        store.get<Payment[]>('payments'),
      ]);
      const today = schoolDate(clock.now());
      const inRange = (iso: string) => {
        const day = schoolDate(new Date(iso));
        return day >= range.from && day <= range.to;
      };

      return teachers.map((teacher): TeacherOverview => {
        const own = students.filter((s) => s.teacherId === teacher.id);
        const ownIds = new Set(own.map((s) => s.id));
        const ownResults = (results ?? []).filter((r) => ownIds.has(r.studentId) && inRange(r.completedAt));
        return {
          id: teacher.id,
          username: teacher.username,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          phone: teacher.phone,
          centerName: teacher.centerName,
          tariffId: teacher.tariffId,
          billingStartsOn: teacher.billingStartsOn,
          disabledAt: teacher.disabledAt,
          createdAt: teacher.createdAt,
          studentCount: own.length,
          activeStudents: own.filter(
            (s) => s.lastActiveAt && clock.now().getTime() - Date.parse(s.lastActiveAt) < SEVEN_DAYS_MS,
          ).length,
          openStudents: own.filter((s) => accessOf(payments ?? [], s.id, today).open).length,
          newStudents: own.filter((s) => s.createdAt && inRange(s.createdAt)).length,
          practiceCount: ownResults.length,
          correctAnswers: ownResults.reduce((n, r) => n + r.correct, 0),
          totalAnswers: ownResults.reduce((n, r) => n + r.total, 0),
          homeworkRooms: (rooms ?? []).filter((r) => r.teacherId === teacher.id && inRange(r.createdAt))
            .length,
        };
      });
    },

    async listLedger() {
      requireAdmin(platform);
      return platform.ledger();
    },

    async recordLedgerEntry(teacherId, kind, amount, note) {
      requireAdmin(platform);
      await platform.saveLedger([
        ...(await platform.ledger()),
        {
          id: generateId(),
          teacherId,
          kind,
          amount,
          periodStart: null,
          tariffId: null,
          note,
          createdAt: clock.now().toISOString(),
        },
      ]);
    },

    async createTeacher(teacher) {
      requireAdmin(platform);
      if (await platform.isUsernameTaken(teacher.username)) throw new AppError('USERNAME_TAKEN');
      if (!(await platform.listTariffs()).some((t) => t.id === teacher.tariffId))
        throw new AppError('TARIFF_NOT_FOUND');

      const id = generateId();
      await platform.saveTeachers([
        ...(await platform.listTeachers()),
        {
          id,
          username: teacher.username,
          passwordHash: await hasher.hash(teacher.password),
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          phone: teacher.phone,
          centerName: teacher.centerName,
          tariffId: teacher.tariffId,
          billingStartsOn: teacher.billingStartsOn,
          disabledAt: null,
          createdAt: clock.now().toISOString(),
        },
      ]);
      if (teacher.bonus > 0) {
        await platform.saveLedger([
          ...(await platform.ledger()),
          {
            id: generateId(),
            teacherId: id,
            kind: 'bonus',
            amount: teacher.bonus,
            periodStart: null,
            tariffId: null,
            note: "Boshlang'ich bonus",
            createdAt: clock.now().toISOString(),
          },
        ]);
      }
      return { id };
    },

    async setTeacherPassword(teacherId, password) {
      requireAdmin(platform);
      const teachers = await platform.listTeachers();
      if (!teachers.some((t) => t.id === teacherId)) throw new AppError('TEACHER_NOT_FOUND');
      const passwordHash = await hasher.hash(password);
      await platform.saveTeachers(teachers.map((t) => (t.id === teacherId ? { ...t, passwordHash } : t)));
    },

    async updateTeacher(teacherId, update) {
      requireAdmin(platform);
      const teachers = await platform.listTeachers();
      const teacher = teachers.find((t) => t.id === teacherId);
      if (!teacher) throw new AppError('TEACHER_NOT_FOUND');
      if (!(await platform.listTariffs()).some((t) => t.id === update.tariffId))
        throw new AppError('TARIFF_NOT_FOUND');
      const charged = (await platform.ledger()).some((e) => e.teacherId === teacherId && e.kind === 'charge');
      if (charged && update.billingStartsOn !== teacher.billingStartsOn)
        throw new AppError('BILLING_STARTED');

      await platform.saveTeachers(
        teachers.map((t) =>
          t.id === teacherId
            ? {
                ...t,
                firstName: update.firstName,
                lastName: update.lastName,
                phone: update.phone,
                centerName: update.centerName,
                tariffId: update.tariffId,
                billingStartsOn: update.billingStartsOn,
                disabledAt: update.disabled ? (t.disabledAt ?? clock.now().toISOString()) : null,
              }
            : t,
        ),
      );
    },

    subscribe: platform.subscribe,
  };
}

export function createLocalPlatformSettingsRepository({
  platform,
}: Dependencies): PlatformSettingsRepository {
  return {
    get: () => platform.getSettings(),
    async save(settings) {
      requireAdmin(platform);
      await platform.saveSettings(settings);
    },
    subscribe: platform.subscribe,
  };
}

const APPLICATIONS_KEY = 'platform/applications';

export function createLocalApplicationRepository({
  store,
  platform,
  clock,
  generateId,
}: Dependencies): ApplicationRepository {
  const list = async () => (await store.get<TeacherApplication[]>(APPLICATIONS_KEY)) ?? [];

  return {
    async submit(application) {
      const offered = (await platform.listTariffs()).some(
        (t) => t.id === application.tariffId && t.isPublic && !t.archivedAt,
      );
      await store.set<TeacherApplication[]>(APPLICATIONS_KEY, [
        {
          ...application,
          tariffId: offered ? application.tariffId : null,
          id: generateId(),
          status: 'new',
          teacherId: null,
          adminNote: '',
          createdAt: clock.now().toISOString(),
        },
        ...(await list()),
      ]);
    },

    async list() {
      requireAdmin(platform);
      return list();
    },

    async update(id, changes) {
      requireAdmin(platform);
      await store.set(
        APPLICATIONS_KEY,
        (await list()).map((a) =>
          a.id === id
            ? {
                ...a,
                status: changes.status,
                teacherId: changes.teacherId === undefined ? a.teacherId : changes.teacherId,
                adminNote: changes.adminNote ?? a.adminNote,
              }
            : a,
        ),
      );
    },

    subscribe: platform.subscribe,
  };
}
