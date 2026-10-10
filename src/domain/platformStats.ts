import { type CalendarDate, addDays, schoolDate } from './billing';
import {
  type LedgerEntry,
  type Tariff,
  type TeacherBillingState,
  type TeacherStatus,
  daysBetween,
  teacherBillingState,
} from './teacherBilling';

/**
 * The superadmin's view of the platform: teachers, their students' activity and the money. The
 * admin sees numbers per teacher, never a student's name.
 */

/** One teacher as the admin sees them, with their class counted for the chosen period. */
export interface TeacherOverview {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  centerName: string;
  tariffId: string;
  billingStartsOn: CalendarDate | null;
  disabledAt: string | null;
  createdAt: string;
  studentCount: number;
  /** Seen in the app during the last 7 days. */
  activeStudents: number;
  /** Students whose own subscription covers today. */
  openStudents: number;
  newStudents: number;
  practiceCount: number;
  correctAnswers: number;
  totalAnswers: number;
  homeworkRooms: number;
}

export interface DateRange {
  from: CalendarDate;
  to: CalendarDate;
}

export function teacherName(teacher: Pick<TeacherOverview, 'firstName' | 'lastName' | 'username'>): string {
  return `${teacher.firstName} ${teacher.lastName}`.trim() || teacher.username;
}

export function ledgerOf(ledger: readonly LedgerEntry[], teacherId: string): LedgerEntry[] {
  return ledger.filter((entry) => entry.teacherId === teacherId);
}

export function billingStateOf(
  teacher: TeacherOverview,
  tariffs: readonly Tariff[],
  ledger: readonly LedgerEntry[],
  today: CalendarDate,
): TeacherBillingState {
  const tariff = tariffs.find((t) => t.id === teacher.tariffId);
  return teacherBillingState({
    entries: ledgerOf(ledger, teacher.id),
    anchor: teacher.billingStartsOn,
    monthlyPrice: tariff?.monthlyPrice ?? 0,
    disabled: teacher.disabledAt !== null,
    today,
  });
}

/** The Tashkent day a ledger entry happened on. */
function entryDate(entry: LedgerEntry): CalendarDate {
  return schoolDate(new Date(entry.createdAt));
}

function inRange(date: CalendarDate, { from, to }: DateRange): boolean {
  return date >= from && date <= to;
}

function sum(entries: readonly LedgerEntry[]): number {
  return entries.reduce((total, entry) => total + entry.amount, 0);
}

/** The period of the same length just before `range`, to compare against. */
export function previousRange({ from, to }: DateRange): DateRange {
  const length = daysBetween(from, to) + 1;
  return { from: addDays(from, -length), to: addDays(from, -1) };
}

export interface DebtorRow {
  teacherId: string;
  name: string;
  balance: number;
  overdueSince: CalendarDate | null;
  status: TeacherStatus;
}

export interface TariffShare {
  tariffId: string;
  name: string;
  teachers: number;
  /** Monthly fees of its billed teachers. */
  mrr: number;
}

export interface PlatformStats {
  teachers: { total: number; newInRange: number; byStatus: Record<TeacherStatus, number> };
  students: { total: number; active: number; open: number; newInRange: number };
  activity: { practices: number; correct: number; total: number; accuracy: number; homeworkRooms: number };
  finance: {
    /** Money received in the period. */
    revenue: number;
    previousRevenue: number;
    /** Fees charged for months that started in the period. */
    charged: number;
    bonuses: number;
    adjustments: number;
    /** Monthly fees of every billed, enabled teacher. */
    mrr: number;
    /** What teachers owe in total (sum of negative balances, as a positive number). */
    debt: number;
    /** What teachers have paid ahead (sum of positive balances). */
    prepaid: number;
    debtors: DebtorRow[];
    byTariff: TariffShare[];
  };
}

export function computePlatformStats(
  teachers: readonly TeacherOverview[],
  tariffs: readonly Tariff[],
  ledger: readonly LedgerEntry[],
  range: DateRange,
  today: CalendarDate,
): PlatformStats {
  const byStatus: Record<TeacherStatus, number> = {
    unbilled: 0,
    ok: 0,
    due_soon: 0,
    overdue: 0,
    blocked: 0,
    disabled: 0,
  };
  const states = teachers.map((teacher) => ({
    teacher,
    state: billingStateOf(teacher, tariffs, ledger, today),
  }));
  for (const { state } of states) byStatus[state.status] += 1;

  const priceOf = (tariffId: string) => tariffs.find((t) => t.id === tariffId)?.monthlyPrice ?? 0;
  const isBilled = (teacher: TeacherOverview) =>
    teacher.billingStartsOn !== null && teacher.disabledAt === null && priceOf(teacher.tariffId) > 0;

  const entriesIn = (kind: LedgerEntry['kind'], period: DateRange) =>
    ledger.filter((e) => e.kind === kind && inRange(entryDate(e), period));

  const total = teachers.reduce((n, t) => n + t.totalAnswers, 0);
  const correct = teachers.reduce((n, t) => n + t.correctAnswers, 0);

  const usedTariffIds = new Set(teachers.map((t) => t.tariffId));
  const byTariff = tariffs
    .filter((tariff) => usedTariffIds.has(tariff.id))
    .map((tariff) => {
      const own = teachers.filter((t) => t.tariffId === tariff.id);
      return {
        tariffId: tariff.id,
        name: tariff.name,
        teachers: own.length,
        mrr: own.filter(isBilled).length * tariff.monthlyPrice,
      };
    })
    .toSorted((a, b) => b.mrr - a.mrr || b.teachers - a.teachers);

  return {
    teachers: {
      total: teachers.length,
      newInRange: teachers.filter((t) => inRange(schoolDate(new Date(t.createdAt)), range)).length,
      byStatus,
    },
    students: {
      total: teachers.reduce((n, t) => n + t.studentCount, 0),
      active: teachers.reduce((n, t) => n + t.activeStudents, 0),
      open: teachers.reduce((n, t) => n + t.openStudents, 0),
      newInRange: teachers.reduce((n, t) => n + t.newStudents, 0),
    },
    activity: {
      practices: teachers.reduce((n, t) => n + t.practiceCount, 0),
      correct,
      total,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
      homeworkRooms: teachers.reduce((n, t) => n + t.homeworkRooms, 0),
    },
    finance: {
      revenue: sum(entriesIn('payment', range)),
      previousRevenue: sum(entriesIn('payment', previousRange(range))),
      charged: -sum(
        ledger.filter((e) => e.kind === 'charge' && e.periodStart && inRange(e.periodStart, range)),
      ),
      bonuses: sum(entriesIn('bonus', range)),
      adjustments: sum(entriesIn('adjustment', range)),
      mrr: teachers.filter(isBilled).reduce((n, t) => n + priceOf(t.tariffId), 0),
      debt: -states.reduce((n, { state }) => n + Math.min(0, state.balance), 0),
      prepaid: states.reduce((n, { state }) => n + Math.max(0, state.balance), 0),
      debtors: states
        .filter(({ state }) => state.balance < 0)
        .map(({ teacher, state }) => ({
          teacherId: teacher.id,
          name: teacherName(teacher),
          balance: state.balance,
          overdueSince: state.overdueSince,
          status: state.status,
        }))
        .toSorted((a, b) => a.balance - b.balance),
      byTariff,
    },
  };
}

export interface MonthTotals {
  /** 'YYYY-MM' */
  month: string;
  payments: number;
  charges: number;
}

/** Money received and fees charged in each of the last `months` months, oldest first. */
export function monthlyFinance(
  ledger: readonly LedgerEntry[],
  months: number,
  today: CalendarDate,
): MonthTotals[] {
  const [year, month] = today.split('-').map(Number);
  const keys = Array.from({ length: months }, (_, i) => {
    const date = new Date(Date.UTC(year, month - 1 - (months - 1 - i), 1));
    return date.toISOString().slice(0, 7);
  });
  const totals = new Map(keys.map((key) => [key, { month: key, payments: 0, charges: 0 }]));

  for (const entry of ledger) {
    if (entry.kind === 'payment') {
      const row = totals.get(entryDate(entry).slice(0, 7));
      if (row) row.payments += entry.amount;
    } else if (entry.kind === 'charge' && entry.periodStart) {
      const row = totals.get(entry.periodStart.slice(0, 7));
      if (row) row.charges += -entry.amount;
    }
  }
  return keys.map((key) => totals.get(key)!);
}

/** Ledger rows for the admin's journal: newest first, narrowed by period, teacher and kind. */
export function filterLedger(
  ledger: readonly LedgerEntry[],
  filter: { range?: DateRange; teacherId?: string | null; kind?: LedgerEntry['kind'] | null },
): LedgerEntry[] {
  return ledger
    .filter((entry) => !filter.range || inRange(entryDate(entry), filter.range))
    .filter((entry) => !filter.teacherId || entry.teacherId === filter.teacherId)
    .filter((entry) => !filter.kind || entry.kind === filter.kind)
    .toSorted((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

/** The journal as CSV for a spreadsheet, with teacher names instead of ids. */
export function ledgerCsv(entries: readonly LedgerEntry[], nameOf: (teacherId: string) => string): string {
  const KIND_LABEL: Record<LedgerEntry['kind'], string> = {
    payment: "To'lov",
    bonus: 'Bonus',
    adjustment: 'Tuzatish',
    charge: 'Oylik yechim',
  };
  const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const rows = entries.map((entry) =>
    [
      schoolDate(new Date(entry.createdAt)),
      quote(nameOf(entry.teacherId)),
      KIND_LABEL[entry.kind],
      String(entry.amount),
      entry.periodStart ?? '',
      quote(entry.note),
    ].join(','),
  );
  return ['Sana,Ustoz,Turi,Summa,Oy,Izoh', ...rows].join('\n');
}
