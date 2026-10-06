import { describe, expect, it } from 'vitest';
import {
  type MarketItem,
  type MarketOrder,
  STARS_COUNTED_FROM,
  calculateEarnedStars,
  calculateSpentStars,
  canAfford,
  computeStarsByStudent,
  computeStudentStars,
} from './market';
import type { PracticeConfig } from './practice/config';
import type { PracticeResult } from './results';

const config: PracticeConfig = {
  kind: 'anzan',
  section: 'formulasiz',
  rowCount: 4,
  secondsPerNumber: 4,
  problemCount: 5,
  digitCount: 1,
};

const makeResult = (mode: PracticeResult['mode'], correct: number, total: number): PracticeResult => ({
  id: 'r1',
  studentId: 's1',
  completedAt: new Date().toISOString(),
  config,
  correct,
  total,
  mode,
  roomId: null,
});

describe('market domain', () => {
  it('gives one star for a homework done without a mistake', () => {
    expect(calculateEarnedStars([makeResult('online', 5, 5)], 's1')).toBe(1);
    expect(calculateEarnedStars([makeResult('online', 20, 20)], 's1')).toBe(1);
  });

  it('gives nothing for a homework with a single mistake, however long it was', () => {
    // 39 right out of 40 is a good homework, but the star is for a clean one.
    expect(calculateEarnedStars([makeResult('online', 39, 40)], 's1')).toBe(0);
    expect(calculateEarnedStars([makeResult('online', 0, 5)], 's1')).toBe(0);
  });

  it('counts one star per homework, so they add up over the term', () => {
    const results = [
      makeResult('online', 5, 5),
      makeResult('online', 4, 5), // one slip: no star
      makeResult('online', 10, 10),
    ];

    expect(calculateEarnedStars(results, 's1')).toBe(2);
  });

  it('awards nothing for solo practice or the classroom match', () => {
    const results = [makeResult('practice', 200, 200), makeResult('classroom', 50, 50)];

    expect(calculateEarnedStars(results, 's1')).toBe(0);
  });

  it('counts only the asked-for student', () => {
    const results = [makeResult('online', 5, 5)];

    expect(calculateEarnedStars(results, 's2')).toBe(0);
  });

  it('ignores an empty homework, which is not a perfect one', () => {
    expect(calculateEarnedStars([makeResult('online', 0, 0)], 's1')).toBe(0);
  });

  it('leaves homework finished before the count started over out of the total', () => {
    const before = {
      ...makeResult('online', 5, 5),
      completedAt: new Date(Date.parse(STARS_COUNTED_FROM) - 1000).toISOString(),
    };
    const after = {
      ...makeResult('online', 5, 5),
      completedAt: new Date(Date.parse(STARS_COUNTED_FROM) + 1000).toISOString(),
    };

    expect(calculateEarnedStars([before], 's1')).toBe(0);
    expect(calculateEarnedStars([before, after], 's1')).toBe(1);
  });

  it('counts a homework whose timestamp cannot be read, rather than losing the star', () => {
    const broken = { ...makeResult('online', 5, 5), completedAt: 'not a date' };

    expect(calculateEarnedStars([broken], 's1')).toBe(1);
  });

  it('pays no attention to the topic, which the teacher chose, not the child', () => {
    const easyForAnAdvancedChild = makeResult('online', 5, 5); // 'formulasiz', level A
    const card = { ...makeResult('online', 5, 5), config: { ...config, kind: 'soroban' as const } };

    expect(calculateEarnedStars([easyForAnAdvancedChild, card], 's1')).toBe(2);
  });

  it('calculates spent stars, excluding cancelled orders', () => {
    const orders: MarketOrder[] = [
      {
        id: 'o1',
        studentId: 's1',
        itemId: 'i1',
        itemTitle: 'Stiker',
        costStars: 5,
        status: 'pending',
        createdAt: '',
      },
      {
        id: 'o2',
        studentId: 's1',
        itemId: 'i2',
        itemTitle: 'Ruchka',
        costStars: 10,
        status: 'delivered',
        createdAt: '',
      },
      {
        id: 'o3',
        studentId: 's1',
        itemId: 'i3',
        itemTitle: 'Daftar',
        costStars: 8,
        status: 'cancelled', // Refunded
        createdAt: '',
      },
    ];

    expect(calculateSpentStars(orders, 's1')).toBe(15);
  });

  it('computes total balance and affordability', () => {
    // Seven clean homeworks -> seven stars.
    const results = Array.from({ length: 7 }, () => makeResult('online', 5, 5));
    const orders: MarketOrder[] = [
      {
        id: 'o1',
        studentId: 's1',
        itemId: 'i1',
        itemTitle: 'Stiker',
        costStars: 3,
        status: 'pending',
        createdAt: '',
      },
    ];

    const stats = computeStudentStars('s1', results, orders);
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
  it('gives every student their own balance from one shared history', () => {
    const results: PracticeResult[] = [
      { ...makeResult('online', 5, 5), studentId: 's1' },
      { ...makeResult('online', 5, 5), studentId: 's2' },
      { ...makeResult('online', 10, 10), studentId: 's2' },
      // Solo practice earns nothing, so it must not lift s3 off zero.
      { ...makeResult('practice', 200, 200), studentId: 's3' },
    ];
    const orders: MarketOrder[] = [
      {
        id: 'o1',
        studentId: 's2',
        itemId: 'i1',
        itemTitle: 'Stiker',
        costStars: 1,
        status: 'pending',
        createdAt: '',
      },
    ];

    const stars = computeStarsByStudent([{ id: 's1' }, { id: 's2' }, { id: 's3' }], results, orders);

    expect(stars.get('s1')).toMatchObject({ earnedStars: 1, spentStars: 0, balance: 1 });
    expect(stars.get('s2')).toMatchObject({ earnedStars: 2, spentStars: 1, balance: 1 });
    expect(stars.get('s3')).toMatchObject({ earnedStars: 0, balance: 0 });
  });

  it('counts a clean homework for every student alike, whatever they are working on', () => {
    const results: PracticeResult[] = [{ ...makeResult('online', 5, 5), studentId: 's1' }];

    expect(computeStarsByStudent([{ id: 's1' }], results, []).get('s1')?.balance).toBe(1);
  });
});
