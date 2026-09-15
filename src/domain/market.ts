import type { PracticeResult } from './results';

export type OrderStatus = 'pending' | 'delivered' | 'cancelled';

export interface MarketItem {
  id: string;
  title: string;
  costStars: number;
  imageUrl: string;
  /** Null means unlimited. */
  stock: number | null;
  createdAt: string;
}

export interface MarketOrder {
  id: string;
  studentId: string;
  itemId: string;
  itemTitle: string;
  costStars: number;
  status: OrderStatus;
  createdAt: string;
}

export interface StudentStarsBalance {
  studentId: string;
  earnedStars: number;
  spentStars: number;
  balance: number;
}

/**
 * Calculates earned stars from competition results:
 * - Only 'online' and 'classroom' matches award stars (solo practice does not).
 * - 1 star per correct answer.
 * - +2 bonus stars if 100% accurate.
 */
export function calculateEarnedStars(results: readonly PracticeResult[], studentId: string): number {
  let earned = 0;
  for (const r of results) {
    if (r.studentId !== studentId) continue;
    if (r.mode !== 'online' && r.mode !== 'classroom') continue;

    earned += r.correct;
    if (r.total > 0 && r.correct === r.total) {
      earned += 2; // Perfect score bonus
    }
  }
  return earned;
}

/**
 * Calculates spent stars from orders.
 * Orders with status 'cancelled' do not count towards spent stars (refunded).
 */
export function calculateSpentStars(orders: readonly MarketOrder[], studentId: string): number {
  let spent = 0;
  for (const o of orders) {
    if (o.studentId !== studentId) continue;
    if (o.status !== 'cancelled') {
      spent += o.costStars;
    }
  }
  return spent;
}

/**
 * Computes full star balance for a student.
 */
export function computeStudentStars(
  studentId: string,
  results: readonly PracticeResult[],
  orders: readonly MarketOrder[],
): StudentStarsBalance {
  const earnedStars = calculateEarnedStars(results, studentId);
  const spentStars = calculateSpentStars(orders, studentId);
  return {
    studentId,
    earnedStars,
    spentStars,
    balance: Math.max(0, earnedStars - spentStars),
  };
}

export function canAfford(balance: number, item: MarketItem): boolean {
  return balance >= item.costStars && (item.stock === null || item.stock > 0);
}
