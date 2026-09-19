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

import { type LevelGroup, LEVEL_INDEX, SECTION_TO_LEVEL } from './users';

/**
 * Calculates earned stars:
 * - Classroom competition ('classroom'): 1 star per correct answer + 2 bonus stars if 100% accurate.
 * - Interactive homework ('online'): 1 star per 4 completed homeworks (Math.floor(completed / 4)).
 * - Solo practice ('practice'): awards 0 stars.
 * - If studentLevel is specified, results on sections easier than the student's level are ignored.
 */
export function calculateEarnedStars(
  results: readonly PracticeResult[],
  studentId: string,
  studentLevel?: LevelGroup,
): number {
  let classroomEarned = 0;
  let onlineCompletedCount = 0;

  for (const r of results) {
    if (r.studentId !== studentId) continue;
    if (r.mode !== 'online' && r.mode !== 'classroom') continue;

    // Check if problem is easier than the student's assigned level group
    if (studentLevel) {
      const problemLevel = SECTION_TO_LEVEL[r.config.section] ?? 'A';
      if (LEVEL_INDEX[problemLevel] < LEVEL_INDEX[studentLevel]) {
        continue; // Student worked on an easier topic, no stars
      }
    }

    if (r.mode === 'classroom') {
      classroomEarned += r.correct;
      if (r.total > 0 && r.correct === r.total) {
        classroomEarned += 2; // Perfect score bonus
      }
    } else if (r.mode === 'online') {
      // Completed interactive homework room
      if (r.total > 0 && r.correct >= 0) {
        onlineCompletedCount++;
      }
    }
  }

  const onlineStars = Math.floor(onlineCompletedCount / 4);
  return classroomEarned + onlineStars;
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
  studentLevel?: LevelGroup,
): StudentStarsBalance {
  const earnedStars = calculateEarnedStars(results, studentId, studentLevel);
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
