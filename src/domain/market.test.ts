import { describe, expect, it } from 'vitest';
import {
  type MarketItem,
  type MarketOrder,
  calculateEarnedStars,
  calculateSpentStars,
  canAfford,
  computeStudentStars,
} from './market';
import type { PracticeConfig } from './practice/config';
import type { PracticeResult } from './results';

const config: PracticeConfig = {
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
  it('calculates earned stars correctly from classroom competitions and interactive homeworks (4 hw = 1 star)', () => {
    const results = [
      makeResult('practice', 5, 5), // solo -> 0 stars
      makeResult('online', 4, 5), // 1st online
      makeResult('online', 3, 5), // 2nd online
      makeResult('online', 5, 5), // 3rd online
      makeResult('online', 4, 5), // 4th online -> 1 star earned here
      makeResult('classroom', 5, 5), // classroom 100% -> 5 + 2 bonus = 7 stars
    ];

    expect(calculateEarnedStars(results, 's1')).toBe(8); // 1 (from 4 online) + 7 (from classroom)
    expect(calculateEarnedStars(results, 's2')).toBe(0);
  });

  it('prevents earning stars on levels easier than student assigned level', () => {
    const results = [
      makeResult('online', 4, 5), // config is 'formulasiz' (Level A)
      makeResult('online', 4, 5),
      makeResult('online', 4, 5),
      makeResult('online', 4, 5),
    ];

    // If student is level 'C' (katta do'st), formulasiz (A) yields 0 stars
    expect(calculateEarnedStars(results, 's1', 'C')).toBe(0);
    // If student is level 'A', 4 online yield 1 star
    expect(calculateEarnedStars(results, 's1', 'A')).toBe(1);
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
    const results = [makeResult('classroom', 5, 5)]; // 5 + 2 = 7 stars
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
