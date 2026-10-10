import { isCalendarDate } from '@/domain/billing';
import type { DateRange } from '@/domain/platformStats';
import { type Random, randomInt } from '@/domain/random';
import { type LedgerKind, MAX_LEDGER_AMOUNT, isFeature, isValidLedgerAmount } from '@/domain/teacherBilling';
import { MIN_TEACHER_PASSWORD_LENGTH, isValidUsername, normalizeUsername } from '@/domain/users';
import { isValidTeacherProfile } from './accountService';
import { AppError } from './errors';
import { MAX_OFFER_DAYS } from './platformService';
import type {
  AdminRepository,
  ChangeListener,
  NewTeacher,
  PlatformSettings,
  PlatformSettingsRepository,
  TariffInput,
  TariffRepository,
  TeacherUpdate,
  Unsubscribe,
} from './ports';

interface AdminDependencies {
  admin: AdminRepository;
  tariffs: TariffRepository;
  settings: PlatformSettingsRepository;
  random: Random;
}

export interface Credentials {
  username: string;
  password: string;
}

const PASSWORD_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';
const MAX_NOTE_LENGTH = 300;
const MAX_TARIFF_NAME = 60;
const MAX_TARIFF_DESCRIPTION = 500;

export function createAdminService({ admin, tariffs, settings, random }: AdminDependencies) {
  const generatePassword = () =>
    Array.from(
      { length: 8 },
      () => PASSWORD_ALPHABET[randomInt(random, 0, PASSWORD_ALPHABET.length - 1)],
    ).join('');

  const validBillingDay = (day: string | null) => day === null || isCalendarDate(day);

  return {
    listTeachers: (range: DateRange) => admin.listTeachers(range),
    listLedger: () => admin.listLedger(),
    listTariffs: () => tariffs.listAll(),
    getSettings: () => settings.get(),

    subscribe(listener: ChangeListener): Unsubscribe {
      const stops = [admin.subscribe(listener), tariffs.subscribe(listener), settings.subscribe(listener)];
      return () => stops.forEach((stop) => stop());
    },

    suggestCredentials(firstName: string): Credentials {
      const slug =
        normalizeUsername(firstName)
          .replace(/[^a-z0-9]/g, '')
          .slice(0, 20) || 'ustoz';
      return { username: `${slug}${randomInt(random, 10, 99)}`, password: generatePassword() };
    },

    async createTeacher(input: NewTeacher): Promise<{ id: string; credentials: Credentials }> {
      const username = normalizeUsername(input.username);
      if (!isValidTeacherProfile(input) || !username) throw new AppError('TEACHER_FIELDS_REQUIRED');
      if (!isValidUsername(username)) throw new AppError('INVALID_USERNAME');
      if (input.password.length < MIN_TEACHER_PASSWORD_LENGTH)
        throw new AppError('TEACHER_PASSWORD_TOO_SHORT');
      if (!input.tariffId) throw new AppError('TARIFF_NOT_FOUND');
      if (!validBillingDay(input.billingStartsOn)) throw new AppError('INVALID_DATE');
      if (!Number.isInteger(input.bonus) || input.bonus < 0 || input.bonus > MAX_LEDGER_AMOUNT) {
        throw new AppError('INVALID_AMOUNT');
      }

      const { id } = await admin.createTeacher({
        ...input,
        username,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone.trim(),
        centerName: input.centerName.trim(),
      });
      return { id, credentials: { username, password: input.password } };
    },

    /** A teacher's password is never readable, so a forgotten one is replaced and handed over. */
    async resetTeacherPassword(teacherId: string, username: string): Promise<Credentials> {
      const password = generatePassword();
      await admin.setTeacherPassword(teacherId, password);
      return { username, password };
    },

    async updateTeacher(teacherId: string, update: TeacherUpdate): Promise<void> {
      if (!isValidTeacherProfile(update)) throw new AppError('TEACHER_FIELDS_REQUIRED');
      if (!validBillingDay(update.billingStartsOn)) throw new AppError('INVALID_DATE');
      await admin.updateTeacher(teacherId, update);
    },

    async recordEntry(
      teacherId: string,
      kind: Exclude<LedgerKind, 'charge'>,
      amount: number,
      note: string,
    ): Promise<void> {
      if (!isValidLedgerAmount(amount, kind)) throw new AppError('INVALID_AMOUNT');
      await admin.recordLedgerEntry(teacherId, kind, amount, note.trim().slice(0, MAX_NOTE_LENGTH));
    },

    /**
     * The teacher who recommended a new colleague gets a free month of their own tariff, noted with
     * who joined. The new teacher gets nothing for being invited: they earn a month by inviting someone.
     */
    async rewardReferral(referrerId: string, amount: number, joinedUsername: string): Promise<void> {
      if (!isValidLedgerAmount(amount, 'bonus')) throw new AppError('INVALID_AMOUNT');
      await admin.recordLedgerEntry(referrerId, 'bonus', amount, `Taklif uchun bonus: @${joinedUsername}`);
    },

    async saveTariff(id: string | null, input: TariffInput): Promise<void> {
      const name = input.name.trim();
      const valid =
        name.length > 0 &&
        name.length <= MAX_TARIFF_NAME &&
        input.description.length <= MAX_TARIFF_DESCRIPTION &&
        Number.isInteger(input.monthlyPrice) &&
        input.monthlyPrice >= 0 &&
        input.monthlyPrice <= MAX_LEDGER_AMOUNT &&
        (input.maxStudents === null || (Number.isInteger(input.maxStudents) && input.maxStudents > 0)) &&
        input.features.every(isFeature);
      if (!valid) throw new AppError('TARIFF_FIELDS_REQUIRED');

      const clean = { ...input, name, description: input.description.trim() };
      await (id ? tariffs.update(id, clean) : tariffs.create(clean));
    },

    async saveSettings(next: PlatformSettings): Promise<void> {
      const isDays = (days: number) => Number.isInteger(days) && days >= 0 && days <= MAX_OFFER_DAYS;
      if (!isDays(next.trialDays) || !isDays(next.moneyBackDays)) throw new AppError('OFFER_DAYS_INVALID');
      await settings.save({
        contactPhone: next.contactPhone.trim().slice(0, 30),
        contactTelegram: next.contactTelegram.trim().slice(0, 40),
        trialDays: next.trialDays,
        moneyBackDays: next.moneyBackDays,
        referralEnabled: next.referralEnabled,
      });
    },
  };
}

export type AdminService = ReturnType<typeof createAdminService>;
