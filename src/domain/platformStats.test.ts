import { describe, expect, it } from 'vitest';
import {
  type TeacherOverview,
  computePlatformStats,
  filterLedger,
  ledgerCsv,
  monthlyFinance,
  previousRange,
} from './platformStats';
import type { LedgerEntry, Tariff } from './teacherBilling';

const tariff = (id: string, monthlyPrice: number): Tariff => ({
  id,
  name: id,
  monthlyPrice,
  maxStudents: null,
  features: [],
  description: '',
  isPublic: true,
  sortOrder: 0,
  archivedAt: null,
});

const teacher = (id: string, overrides: Partial<TeacherOverview> = {}): TeacherOverview => ({
  id,
  username: id,
  firstName: id.toUpperCase(),
  lastName: '',
  phone: '',
  centerName: '',
  tariffId: 'pro',
  billingStartsOn: '2026-01-05',
  disabledAt: null,
  createdAt: '2026-01-05T05:00:00Z',
  studentCount: 10,
  activeStudents: 5,
  openStudents: 8,
  newStudents: 1,
  practiceCount: 20,
  correctAnswers: 90,
  totalAnswers: 100,
  homeworkRooms: 2,
  ...overrides,
});

let nextId = 0;
const entry = (
  teacherId: string,
  kind: LedgerEntry['kind'],
  amount: number,
  createdAt: string,
  periodStart: string | null = null,
): LedgerEntry => ({
  id: `e${++nextId}`,
  teacherId,
  kind,
  amount,
  periodStart,
  tariffId: null,
  note: '',
  createdAt,
});

const TARIFFS = [tariff('pro', 100), tariff('free', 0)];
const LEDGER = [
  entry('a', 'payment', 300, '2026-01-05T06:00:00Z'),
  entry('a', 'charge', -100, '2026-01-05T19:05:00Z', '2026-01-05'),
  entry('a', 'charge', -100, '2026-02-05T19:05:00Z', '2026-02-05'),
  entry('b', 'bonus', 100, '2026-01-10T06:00:00Z'),
  entry('b', 'charge', -100, '2026-01-10T19:05:00Z', '2026-01-10'),
  entry('b', 'charge', -100, '2026-02-10T19:05:00Z', '2026-02-10'),
  entry('b', 'payment', 50, '2026-02-12T06:00:00Z'),
];

describe('platform statistics', () => {
  const teachers = [
    teacher('a'),
    teacher('b', { billingStartsOn: '2026-01-10' }),
    teacher('c', { tariffId: 'free', billingStartsOn: null, createdAt: '2026-02-03T05:00:00Z' }),
  ];
  const stats = computePlatformStats(
    teachers,
    TARIFFS,
    LEDGER,
    { from: '2026-02-01', to: '2026-02-28' },
    '2026-02-14',
  );

  it("adds up the teachers' classes without naming any student", () => {
    expect(stats.students).toEqual({ total: 30, active: 15, open: 24, newInRange: 3 });
    expect(stats.activity).toEqual({
      practices: 60,
      correct: 270,
      total: 300,
      accuracy: 90,
      homeworkRooms: 6,
    });
  });

  it('sorts teachers by how their billing stands', () => {
    expect(stats.teachers.total).toBe(3);
    expect(stats.teachers.newInRange).toBe(1);
    expect(stats.teachers.byStatus).toMatchObject({ ok: 1, overdue: 1, unbilled: 1 });
  });

  it('reports money received, fees charged, debt and what is paid ahead', () => {
    expect(stats.finance).toMatchObject({
      revenue: 50,
      previousRevenue: 300,
      charged: 200,
      bonuses: 0,
      mrr: 200,
      debt: 50,
      prepaid: 100,
    });
    expect(stats.finance.debtors).toEqual([
      { teacherId: 'b', name: 'B', balance: -50, overdueSince: '2026-02-10', status: 'overdue' },
    ]);
    expect(stats.finance.byTariff).toEqual([
      { tariffId: 'pro', name: 'pro', teachers: 2, mrr: 200 },
      { tariffId: 'free', name: 'free', teachers: 1, mrr: 0 },
    ]);
  });

  it('compares a period with the one of the same length before it', () => {
    expect(previousRange({ from: '2026-02-01', to: '2026-02-28' })).toEqual({
      from: '2026-01-04',
      to: '2026-01-31',
    });
  });
});

describe('monthly finance', () => {
  it('counts payments by the day received and charges by the month they pay for', () => {
    expect(monthlyFinance(LEDGER, 3, '2026-02-14')).toEqual([
      { month: '2025-12', payments: 0, charges: 0 },
      { month: '2026-01', payments: 300, charges: 200 },
      { month: '2026-02', payments: 50, charges: 200 },
    ]);
  });
});

describe('the ledger journal', () => {
  it('narrows by teacher and kind, newest first', () => {
    const rows = filterLedger(LEDGER, { teacherId: 'b', kind: 'charge' });
    expect(rows.map((row) => row.periodStart)).toEqual(['2026-02-10', '2026-01-10']);
  });

  it('exports CSV with names and quoted notes', () => {
    const csv = ledgerCsv([{ ...LEDGER[0], note: 'naqd "kassa"' }], () => 'Ali, ustoz');
    expect(csv.split('\n')).toEqual([
      'Sana,Ustoz,Turi,Summa,Oy,Izoh',
      `2026-01-05,"Ali, ustoz",To'lov,300,,"naqd ""kassa"""`,
    ]);
  });
});
