import { type CalendarDate, addDays, addMonths } from './billing';

/**
 * What a teacher pays the platform. A teacher's tariff sets the monthly fee, how many students they
 * may have and which sections are open to them and to their students. The fee is taken from the
 * teacher's balance on the same day every month, counted from the day billing started, so paying
 * several months ahead simply leaves the balance positive.
 *
 * A charge that the balance cannot cover makes the teacher overdue: they keep working, with a
 * warning, for `GRACE_DAYS`, and are then blocked from managing their class until they pay.
 * The rules mirror the SQL in the platform migration; schema.test.ts checks that both agree.
 */

/** Sections a tariff can open. Everything else (students, their payments, practice, abacus) is always open. */
export const FEATURES = [
  'homework_rooms',
  'classroom',
  'market',
  'leaderboard',
  'stats',
  'worksheet',
  'written_homework',
  'extra_drills',
  'telegram',
] as const;

export type Feature = (typeof FEATURES)[number];

export interface FeatureMeta {
  label: string;
  /** Names the section at a glance; the same emoji as its tab, where it has one. */
  icon: string;
  /** What the section lets the teacher do, as the admin reads it when building a tariff. */
  teacher: string | null;
  /** What the teacher's students get; null when they see nothing of it. */
  student: string | null;
}

export const FEATURE_META: Record<Feature, FeatureMeta> = {
  homework_rooms: {
    label: 'Interaktiv uy vazifasi',
    icon: '📝',
    teacher: "Interaktiv vazifa tuzib, o'quvchilarga beradi",
    student: 'Uy vazifasi va yulduzchalar',
  },
  classroom: {
    label: 'Sinf musobaqasi',
    icon: '🏫',
    teacher: "2–4 o'quvchini proyektorda bellashtiradi",
    student: null,
  },
  market: {
    label: "Do'kon",
    icon: '🎁',
    teacher: "Sovg'alar qo'yadi, buyurtmalarni ko'radi",
    student: "Yulduzchaga sovg'a olish",
  },
  leaderboard: {
    label: 'Reyting',
    icon: '🏆',
    teacher: "Sinf reytingini ko'radi",
    student: 'Sinfdoshlar reytingi',
  },
  stats: {
    label: 'Statistika',
    icon: '📊',
    teacher: "Natija va faollik statistikasini ko'radi",
    student: null,
  },
  worksheet: {
    label: 'Yozma vazifa',
    icon: '🖨️',
    teacher: "Mavzu bo'yicha A4 misollar varag'ini chop etadi",
    student: null,
  },
  written_homework: {
    label: 'Yozma uy vazifasi belgisi',
    icon: '✅',
    teacher: "Yozma vazifaga «bajardi / chala» belgisini qo'yadi",
    student: null,
  },
  extra_drills: {
    label: "Qo'shimcha mashqlar",
    icon: '🧩',
    teacher: "Chaqnovchi mashqini vazifaga qo'sha oladi",
    student: 'Chaqnovchi va ustunlar mashqlari',
  },
  telegram: {
    label: 'Telegram xabarlari',
    icon: '📱',
    teacher: 'Natija va vazifalar haqida xabar oladi',
    student: "Yangi vazifa va sovg'alar haqida xabar",
  },
};

export function isFeature(value: string): value is Feature {
  return (FEATURES as readonly string[]).includes(value);
}

export function hasFeature(features: readonly Feature[] | undefined, feature: Feature): boolean {
  return features?.includes(feature) ?? false;
}

export interface Tariff {
  id: string;
  name: string;
  /** So'm per month. */
  monthlyPrice: number;
  /** Null: no limit. */
  maxStudents: number | null;
  features: Feature[];
  description: string;
  /** Shown on the landing page. */
  isPublic: boolean;
  sortOrder: number;
  /** Archived tariffs keep their teachers but are no longer offered. */
  archivedAt: string | null;
}

export type LedgerKind = 'payment' | 'bonus' | 'adjustment' | 'charge';

export interface LedgerEntry {
  id: string;
  teacherId: string;
  kind: LedgerKind;
  /** So'm: positive adds to the balance, a charge is negative. */
  amount: number;
  /** The month a charge pays for; null for everything else. */
  periodStart: CalendarDate | null;
  /** The tariff a charge was taken for. */
  tariffId: string | null;
  note: string;
  createdAt: string;
}

export const GRACE_DAYS = 7;
/** How early the teacher is warned that the next charge will not be covered. */
export const DUE_SOON_DAYS = 3;
/** Days before the block on which the teacher gets a Telegram reminder. */
export const BLOCK_REMINDER_DAYS = [3, 1] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysBetween(from: CalendarDate, to: CalendarDate): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/**
 * The days a monthly fee is due up to `today`: the anchor and the same day of every later month,
 * always counted from the anchor (Jan 31 → Feb 28 → Mar 31), as Postgres adds months.
 */
export function chargeDates(anchor: CalendarDate | null, today: CalendarDate): CalendarDate[] {
  if (!anchor || anchor > today) return [];
  const dates: CalendarDate[] = [];
  for (let k = 0; ; k++) {
    const date = addMonths(anchor, k);
    if (date > today) return dates;
    dates.push(date);
  }
}

/** The next day the fee is taken, after `today`. */
export function nextChargeDate(anchor: CalendarDate, today: CalendarDate): CalendarDate {
  for (let k = 0; ; k++) {
    const date = addMonths(anchor, k);
    if (date > today) return date;
  }
}

/** The charges that should exist by `today` but are missing. A free tariff charges nothing. */
export function dueCharges(
  teacherId: string,
  anchor: CalendarDate | null,
  tariff: Pick<Tariff, 'id' | 'name' | 'monthlyPrice'>,
  existing: readonly LedgerEntry[],
  today: CalendarDate,
): Omit<LedgerEntry, 'id' | 'createdAt'>[] {
  if (tariff.monthlyPrice <= 0) return [];
  const charged = new Set(existing.filter((e) => e.kind === 'charge').map((e) => e.periodStart));
  return chargeDates(anchor, today)
    .filter((date) => !charged.has(date))
    .map((date) => ({
      teacherId,
      kind: 'charge' as const,
      amount: -tariff.monthlyPrice,
      periodStart: date,
      tariffId: tariff.id,
      note: tariff.name,
    }));
}

export function balanceOf(entries: readonly LedgerEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.amount, 0);
}

/**
 * The month the teacher owes for: the oldest charge that payments, bonuses and adjustments do not
 * cover, taking charges oldest first. Null when everything is paid.
 */
export function overdueSince(entries: readonly LedgerEntry[]): CalendarDate | null {
  const credit = entries.filter((e) => e.kind !== 'charge').reduce((sum, e) => sum + e.amount, 0);
  const charges = entries
    .filter(
      (e): e is LedgerEntry & { periodStart: CalendarDate } => e.kind === 'charge' && e.periodStart !== null,
    )
    .toSorted((a, b) => (a.periodStart < b.periodStart ? -1 : a.periodStart > b.periodStart ? 1 : 0));

  let due = 0;
  for (const charge of charges) {
    due += -charge.amount;
    if (due > credit) return charge.periodStart;
  }
  return null;
}

export function isBlocked(since: CalendarDate | null, today: CalendarDate): boolean {
  return since !== null && today >= addDays(since, GRACE_DAYS);
}

export type TeacherStatus = 'unbilled' | 'ok' | 'due_soon' | 'overdue' | 'blocked' | 'disabled';

export interface TeacherBillingState {
  status: TeacherStatus;
  balance: number;
  overdueSince: CalendarDate | null;
  /** The day management closes while the debt stays unpaid. */
  blockedFrom: CalendarDate | null;
  /** Days left before the block; null when not overdue. */
  daysUntilBlock: number | null;
  nextChargeDate: CalendarDate | null;
  nextChargeAmount: number;
  /** Whole months the balance pays for ahead. */
  monthsCovered: number;
}

export interface TeacherBillingInput {
  entries: readonly LedgerEntry[];
  /** The day billing started; null while the teacher is not billed. */
  anchor: CalendarDate | null;
  monthlyPrice: number;
  disabled: boolean;
  today: CalendarDate;
}

export function teacherBillingState({
  entries,
  anchor,
  monthlyPrice,
  disabled,
  today,
}: TeacherBillingInput): TeacherBillingState {
  const balance = balanceOf(entries);
  const since = overdueSince(entries);
  const blockedFrom = since ? addDays(since, GRACE_DAYS) : null;
  const billed = anchor !== null && monthlyPrice > 0;
  const next = anchor ? nextChargeDate(anchor, today) : null;

  const base = {
    balance,
    overdueSince: since,
    blockedFrom,
    daysUntilBlock: blockedFrom ? Math.max(0, daysBetween(today, blockedFrom)) : null,
    nextChargeDate: billed ? next : null,
    nextChargeAmount: billed ? monthlyPrice : 0,
    monthsCovered: billed && balance > 0 ? Math.floor(balance / monthlyPrice) : 0,
  };

  const status: TeacherStatus = disabled
    ? 'disabled'
    : isBlocked(since, today)
      ? 'blocked'
      : since
        ? 'overdue'
        : !billed
          ? 'unbilled'
          : next && daysBetween(today, next) <= DUE_SOON_DAYS && balance < monthlyPrice
            ? 'due_soon'
            : 'ok';

  return { status, ...base };
}

/** Whether management is closed for the teacher. */
export function isLocked(status: TeacherStatus): boolean {
  return status === 'blocked' || status === 'disabled';
}

export function canAddStudent(studentCount: number, maxStudents: number | null): boolean {
  return maxStudents === null || studentCount < maxStudents;
}

/** Amounts the admin types: whole so'm, positive, and below a typo guard of a billion. */
export const MAX_LEDGER_AMOUNT = 1_000_000_000;

export function isValidLedgerAmount(amount: number, kind: Exclude<LedgerKind, 'charge'>): boolean {
  if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > MAX_LEDGER_AMOUNT) return false;
  return kind === 'adjustment' || amount > 0;
}
