import type { Student } from './users';

/**
 * Paid access for students. The teacher records a payment ("To'ladi") with the day the student's
 * access ends, and the latest payment decides. Access is counted in whole days in Tashkent.
 */

/** A day in Tashkent as 'YYYY-MM-DD'; such strings sort in date order. */
export type CalendarDate = string;

export type PaymentKind = 'payment' | 'launch';

export interface Payment {
  id: string;
  studentId: string;
  recordedAt: string;
  /** The first day without access: the student is open while today is earlier. */
  paidUntil: CalendarDate;
  /** `launch`: the rest of the month that students already had when billing started. */
  kind: PaymentKind;
}

export interface StudentAccess {
  open: boolean;
  /** Null when no payment was ever recorded. */
  paidUntil: CalendarDate | null;
  /** The payment that decides access; an undo takes it back. */
  latest: Payment | null;
}

/** How far ahead the teacher may open a student; it also catches a mistyped year. */
export const MAX_PREPAID_MONTHS = 24;

/** Uzbekistan keeps UTC+5 all year, without daylight saving time. */
const SCHOOL_UTC_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function schoolDate(now: Date): CalendarDate {
  return new Date(now.getTime() + SCHOOL_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

/** Midnight in Tashkent after `now`, when access may open or close. */
export function nextSchoolDayStart(now: Date): Date {
  const local = now.getTime() + SCHOOL_UTC_OFFSET_MS;
  return new Date(local - (local % DAY_MS) + DAY_MS - SCHOOL_UTC_OFFSET_MS);
}

/** A real day written as 'YYYY-MM-DD', so not '2027-02-30'. */
export function isCalendarDate(value: string): boolean {
  if (!CALENDAR_DATE_PATTERN.test(value)) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** The same day `months` later, or that month's last day when it is shorter (Jan 31 → Feb 28), as in Postgres. */
export function addMonths(date: CalendarDate, months: number): CalendarDate {
  const [year, month, day] = date.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const daysInMonth = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, daysInMonth));
  return target.toISOString().slice(0, 10);
}

export function isOpen(paidUntil: CalendarDate | null, today: CalendarDate): boolean {
  return paidUntil !== null && today < paidUntil;
}

/** Paying for `months`: counted from the current end while access lasts, so paying early loses no days. */
export function suggestPaidUntil(
  paidUntil: CalendarDate | null,
  today: CalendarDate,
  months: number,
): CalendarDate {
  return addMonths(isOpen(paidUntil, today) && paidUntil !== null ? paidUntil : today, months);
}

/** The teacher may open a student from tomorrow up to `MAX_PREPAID_MONTHS` ahead. */
export function isValidPaidUntil(paidUntil: string, today: CalendarDate): boolean {
  return isCalendarDate(paidUntil) && paidUntil > today && paidUntil <= addMonths(today, MAX_PREPAID_MONTHS);
}

/** Students who already exist when billing starts keep access until the end of that month. */
export function launchPaidUntil(today: CalendarDate): CalendarDate {
  return addMonths(`${today.slice(0, 7)}-01`, 1);
}

/** Payments are kept in the order they were recorded, so the latest one is the last. */
export function latestPayment(payments: readonly Payment[], studentId: string): Payment | null {
  return payments.findLast((payment) => payment.studentId === studentId) ?? null;
}

export function accessOf(
  payments: readonly Payment[],
  studentId: string,
  today: CalendarDate,
): StudentAccess {
  const latest = latestPayment(payments, studentId);
  const paidUntil = latest?.paidUntil ?? null;
  return { open: isOpen(paidUntil, today), paidUntil, latest };
}

/** Students who may not take part in anything today. */
export function closedStudentIds(
  students: readonly Pick<Student, 'id'>[],
  payments: readonly Payment[],
  today: CalendarDate,
): Set<string> {
  return new Set(students.filter((s) => !accessOf(payments, s.id, today).open).map((s) => s.id));
}
