import { describe, expect, it } from 'vitest';
import {
  type LedgerEntry,
  balanceOf,
  canAddStudent,
  chargeDates,
  dueCharges,
  isBlocked,
  isValidLedgerAmount,
  nextChargeDate,
  overdueSince,
  teacherBillingState,
} from './teacherBilling';

let nextId = 0;
const entry = (
  kind: LedgerEntry['kind'],
  amount: number,
  periodStart: string | null = null,
): LedgerEntry => ({
  id: `e${++nextId}`,
  teacherId: 't',
  kind,
  amount,
  periodStart,
  tariffId: kind === 'charge' ? 'tariff' : null,
  note: '',
  createdAt: '2026-01-01T00:00:00Z',
});
const charge = (periodStart: string, amount = 100) => entry('charge', -amount, periodStart);

describe('charge dates', () => {
  it('counts every month from the anchor, keeping to the last day of short months', () => {
    expect(chargeDates('2026-01-31', '2026-04-30')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
    expect(chargeDates('2028-01-31', '2028-02-29')).toEqual(['2028-01-31', '2028-02-29']);
  });

  it('charges nothing before billing starts or without an anchor', () => {
    expect(chargeDates('2026-05-10', '2026-05-09')).toEqual([]);
    expect(chargeDates(null, '2026-05-09')).toEqual([]);
  });

  it('names the next charge day after today', () => {
    expect(nextChargeDate('2026-01-31', '2026-02-27')).toBe('2026-02-28');
    expect(nextChargeDate('2026-01-31', '2026-02-28')).toBe('2026-03-31');
    expect(nextChargeDate('2026-06-01', '2026-05-20')).toBe('2026-06-01');
  });
});

describe('due charges', () => {
  const tariff = { id: 'pro', name: 'Pro', monthlyPrice: 150_000 };

  it('adds only the months that are missing, at the current price', () => {
    const existing = [charge('2026-03-10', 120_000)];
    expect(dueCharges('t', '2026-03-10', tariff, existing, '2026-05-10')).toEqual([
      {
        teacherId: 't',
        kind: 'charge',
        amount: -150_000,
        periodStart: '2026-04-10',
        tariffId: 'pro',
        note: 'Pro',
      },
      {
        teacherId: 't',
        kind: 'charge',
        amount: -150_000,
        periodStart: '2026-05-10',
        tariffId: 'pro',
        note: 'Pro',
      },
    ]);
  });

  it('charges nothing on a free tariff', () => {
    expect(dueCharges('t', '2026-03-10', { ...tariff, monthlyPrice: 0 }, [], '2026-05-10')).toEqual([]);
  });
});

describe('balance and debt', () => {
  it('takes charges oldest first against everything paid in', () => {
    const entries = [entry('payment', 150), charge('2026-01-05'), charge('2026-02-05'), charge('2026-03-05')];
    expect(balanceOf(entries)).toBe(-150);
    expect(overdueSince(entries)).toBe('2026-02-05');
  });

  it('owes nothing when payments and bonuses cover every charge', () => {
    const entries = [entry('bonus', 100), entry('payment', 200), charge('2026-01-05'), charge('2026-02-05')];
    expect(overdueSince(entries)).toBeNull();
    expect(balanceOf(entries)).toBe(100);
  });

  it('lets a negative adjustment uncover an old charge', () => {
    const entries = [entry('payment', 100), charge('2026-01-05'), entry('adjustment', -100)];
    expect(overdueSince(entries)).toBe('2026-01-05');
  });

  it('blocks on the seventh day of the debt', () => {
    expect(isBlocked('2026-02-05', '2026-02-11')).toBe(false);
    expect(isBlocked('2026-02-05', '2026-02-12')).toBe(true);
    expect(isBlocked(null, '2030-01-01')).toBe(false);
  });
});

describe('teacher billing state', () => {
  const base = { anchor: '2026-01-05', monthlyPrice: 100, disabled: false };

  it('is fine while the balance covers the coming month', () => {
    const state = teacherBillingState({
      ...base,
      entries: [entry('payment', 300), charge('2026-01-05')],
      today: '2026-01-20',
    });
    expect(state).toMatchObject({
      status: 'ok',
      balance: 200,
      nextChargeDate: '2026-02-05',
      monthsCovered: 2,
    });
  });

  it('warns a few days before a charge the balance cannot cover', () => {
    const entries = [entry('payment', 150), charge('2026-01-05')];
    expect(teacherBillingState({ ...base, entries, today: '2026-02-01' }).status).toBe('ok');
    expect(teacherBillingState({ ...base, entries, today: '2026-02-02' }).status).toBe('due_soon');
  });

  it('counts down to the block while overdue, then blocks', () => {
    const entries = [entry('payment', 100), charge('2026-01-05'), charge('2026-02-05')];
    expect(teacherBillingState({ ...base, entries, today: '2026-02-09' })).toMatchObject({
      status: 'overdue',
      balance: -100,
      blockedFrom: '2026-02-12',
      daysUntilBlock: 3,
    });
    expect(teacherBillingState({ ...base, entries, today: '2026-02-12' }).status).toBe('blocked');
  });

  it('opens again as soon as the payment covers the debt', () => {
    const entries = [charge('2026-01-05'), charge('2026-02-05'), entry('payment', 200)];
    expect(teacherBillingState({ ...base, entries, today: '2026-03-01' }).status).toBe('ok');
  });

  it('tells apart an unbilled and a disabled teacher', () => {
    expect(teacherBillingState({ ...base, anchor: null, entries: [], today: '2026-03-01' }).status).toBe(
      'unbilled',
    );
    expect(teacherBillingState({ ...base, monthlyPrice: 0, entries: [], today: '2026-03-01' }).status).toBe(
      'unbilled',
    );
    expect(teacherBillingState({ ...base, disabled: true, entries: [], today: '2026-03-01' }).status).toBe(
      'disabled',
    );
  });
});

describe('limits and amounts', () => {
  it('lets a teacher add students up to the tariff limit', () => {
    expect(canAddStudent(29, 30)).toBe(true);
    expect(canAddStudent(30, 30)).toBe(false);
    expect(canAddStudent(1000, null)).toBe(true);
  });

  it('accepts positive whole payments and signed adjustments', () => {
    expect(isValidLedgerAmount(150_000, 'payment')).toBe(true);
    expect(isValidLedgerAmount(-150_000, 'payment')).toBe(false);
    expect(isValidLedgerAmount(-50_000, 'adjustment')).toBe(true);
    expect(isValidLedgerAmount(0, 'bonus')).toBe(false);
    expect(isValidLedgerAmount(10.5, 'payment')).toBe(false);
    expect(isValidLedgerAmount(2_000_000_000, 'payment')).toBe(false);
  });
});
