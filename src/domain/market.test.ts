import { describe, expect, it } from 'vitest';
import {
  type MarketItem,
  type StarAward,
  calculateEarnedStars,
  calculateSpentStars,
  canAfford,
  computeStarsByStudent,
  computeStudentStars,
} from './market';

let nextId = 0;

const award = (studentId: string, delta: number, reason: StarAward['reason']): StarAward => ({
  id: `a${(nextId += 1)}`,
  studentId,
  delta,
  reason,
  sourceResultId: reason === 'homework' ? `r${nextId}` : null,
  sourceOrderId: reason === 'homework' ? null : `o${nextId}`,
  note: null,
  createdAt: new Date().toISOString(),
});

const star = (studentId = 's1') => award(studentId, 1, 'homework');
const spend = (cost: number, studentId = 's1') => award(studentId, -cost, 'purchase');

describe('market domain', () => {
  it('adds up the stars a student was given', () => {
    expect(calculateEarnedStars([star(), star(), star()], 's1')).toBe(3);
  });

  it('counts spending as a positive amount, kept apart from what was earned', () => {
    const ledger = [star(), star(), spend(3)];

    expect(calculateEarnedStars(ledger, 's1')).toBe(2);
    expect(calculateSpentStars(ledger, 's1')).toBe(3);
  });

  it("keeps each student's ledger to themselves", () => {
    const ledger = [star('s1'), star('s2'), spend(1, 's2')];

    expect(calculateEarnedStars(ledger, 's1')).toBe(1);
    expect(calculateSpentStars(ledger, 's1')).toBe(0);
    expect(calculateEarnedStars(ledger, 's2')).toBe(1);
    expect(calculateSpentStars(ledger, 's2')).toBe(1);
  });

  it('never shows a balance below zero, whatever the ledger says', () => {
    const stats = computeStudentStars('s1', [star(), spend(5)]);

    expect(stats.earnedStars).toBe(1);
    expect(stats.spentStars).toBe(5);
    expect(stats.balance).toBe(0);
  });

  it('starts a student with no ledger at zero', () => {
    expect(computeStudentStars('s1', [])).toMatchObject({ earnedStars: 0, spentStars: 0, balance: 0 });
  });

  it('computes total balance and affordability', () => {
    const ledger = [...Array.from({ length: 7 }, () => star()), spend(3)];

    const stats = computeStudentStars('s1', ledger);
    expect(stats.earnedStars).toBe(7);
    expect(stats.spentStars).toBe(3);
    expect(stats.balance).toBe(4);

    const cheapItem: MarketItem = {
      id: 'i1',
      title: 'Stiker',
      costStars: 4,
      imageUrl: '⭐',
      stock: 2,
      createdAt: '',
    };
    const expensiveItem: MarketItem = { ...cheapItem, costStars: 5 };
    const outOfStockItem: MarketItem = { ...cheapItem, costStars: 2, stock: 0 };

    expect(canAfford(stats.balance, cheapItem)).toBe(true);
    expect(canAfford(stats.balance, expensiveItem)).toBe(false);
    expect(canAfford(stats.balance, outOfStockItem)).toBe(false);
  });
});

describe('computeStarsByStudent', () => {
  it('gives every student their own balance from one shared ledger', () => {
    const ledger = [star('s1'), star('s2'), star('s2'), spend(1, 's2')];

    const stars = computeStarsByStudent([{ id: 's1' }, { id: 's2' }, { id: 's3' }], ledger);

    expect(stars.get('s1')).toMatchObject({ earnedStars: 1, spentStars: 0, balance: 1 });
    expect(stars.get('s2')).toMatchObject({ earnedStars: 2, spentStars: 1, balance: 1 });
    expect(stars.get('s3')).toMatchObject({ earnedStars: 0, balance: 0 });
  });

  it('leaves a student with no ledger at zero rather than undefined', () => {
    expect(computeStarsByStudent([{ id: 's9' }], []).get('s9')?.balance).toBe(0);
  });
});
