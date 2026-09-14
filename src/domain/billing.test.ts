import { describe, expect, it } from 'vitest';
import {
  type Payment,
  accessOf,
  addDays,
  addMonths,
  closedStudentIds,
  isCalendarDate,
  isOpen,
  isValidPaidUntil,
  launchPaidUntil,
  nextSchoolDayStart,
  schoolDate,
  suggestPaidUntil,
} from './billing';

const payment = (studentId: string, paidUntil: string): Payment => ({
  id: `${studentId}-${paidUntil}`,
  studentId,
  recordedAt: '2026-09-01T00:00:00.000Z',
  paidUntil,
  kind: 'payment',
});

describe('school days', () => {
  it('counts days in Tashkent, five hours ahead of UTC', () => {
    expect(schoolDate(new Date('2026-09-14T18:59:59Z'))).toBe('2026-09-14');
    expect(schoolDate(new Date('2026-09-14T19:00:00Z'))).toBe('2026-09-15');
  });

  it('knows when the next day starts', () => {
    expect(nextSchoolDayStart(new Date('2026-09-14T10:00:00Z')).toISOString()).toBe(
      '2026-09-14T19:00:00.000Z',
    );
    expect(nextSchoolDayStart(new Date('2026-09-14T19:00:00Z')).toISOString()).toBe(
      '2026-09-15T19:00:00.000Z',
    );
  });
});

describe('calendar dates', () => {
  it('accepts only real days written as YYYY-MM-DD', () => {
    expect(['2026-09-14', '2028-02-29'].every(isCalendarDate)).toBe(true);
    expect(['2027-02-29', '2026-13-01', '14.10.2026', ''].some(isCalendarDate)).toBe(false);
  });

  it('adds days across month and year ends', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it.each([
    ['2026-09-14', 1, '2026-10-14'],
    ['2026-12-15', 1, '2027-01-15'],
    ['2026-01-31', 1, '2026-02-28'],
    ['2028-01-31', 1, '2028-02-29'],
    ['2026-03-31', 1, '2026-04-30'],
    ['2026-08-31', 2, '2026-10-31'],
  ])('%s plus %i month(s) is %s', (date, months, expected) => {
    expect(addMonths(date, months)).toBe(expected);
  });
});

describe('student access', () => {
  it('stays open until the day the payment runs out', () => {
    expect(isOpen('2026-10-14', '2026-10-13')).toBe(true);
    expect(isOpen('2026-10-14', '2026-10-14')).toBe(false);
    expect(isOpen(null, '2026-10-14')).toBe(false);
  });

  it('suggests months from today once access is closed', () => {
    expect(suggestPaidUntil(null, '2026-09-14', 1)).toBe('2026-10-14');
    expect(suggestPaidUntil('2026-09-14', '2026-09-14', 3)).toBe('2026-12-14');
    expect(suggestPaidUntil('2026-08-01', '2026-09-14', 4)).toBe('2027-01-14');
  });

  it('suggests months after the current end while access lasts', () => {
    expect(suggestPaidUntil('2026-10-14', '2026-10-10', 1)).toBe('2026-11-14');
    expect(suggestPaidUntil('2026-10-14', '2026-10-10', 3)).toBe('2027-01-14');
  });

  it('lets the teacher open a student from tomorrow up to 24 months ahead', () => {
    expect(isValidPaidUntil('2026-09-15', '2026-09-14')).toBe(true);
    expect(isValidPaidUntil('2028-09-14', '2026-09-14')).toBe(true);
    expect(isValidPaidUntil('2026-09-14', '2026-09-14')).toBe(false);
    expect(isValidPaidUntil('2028-09-15', '2026-09-14')).toBe(false);
    expect(isValidPaidUntil('2027-02-30', '2026-09-14')).toBe(false);
  });

  it('gives students who exist when billing starts the rest of the month', () => {
    expect(launchPaidUntil('2026-09-14')).toBe('2026-10-01');
    expect(launchPaidUntil('2026-12-31')).toBe('2027-01-01');
  });

  it('decides access by the latest payment, even when it ends earlier', () => {
    const payments = [
      payment('ali', '2026-12-14'),
      payment('vali', '2026-09-01'),
      payment('ali', '2026-11-14'),
    ];

    expect(accessOf(payments, 'ali', '2026-10-20')).toEqual({
      open: true,
      paidUntil: '2026-11-14',
      latest: payments[2],
    });
    expect(accessOf(payments, 'vali', '2026-10-20')).toMatchObject({ open: false, paidUntil: '2026-09-01' });
    expect(accessOf(payments, 'guli', '2026-10-20')).toEqual({ open: false, paidUntil: null, latest: null });
    expect(closedStudentIds([{ id: 'ali' }, { id: 'vali' }, { id: 'guli' }], payments, '2026-10-20')).toEqual(
      new Set(['vali', 'guli']),
    );
  });
});
