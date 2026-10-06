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
 * The day the count started over: 6 October 2026, midnight in Tashkent. Stars are not stored but
 * recomputed from the whole history, so the teacher's "start from zero" is this line — homework
 * finished before it is left in the history for the statistics and simply earns nothing. Moving
 * this date forward wipes the class's stars again, so it is changed deliberately, never in passing.
 */
export const STARS_COUNTED_FROM = '2026-10-05T19:00:00.000Z';

const STARS_COUNTED_FROM_MS = Date.parse(STARS_COUNTED_FROM);

/**
 * Calculates earned stars. One interactive homework ('online') done without a single mistake is
 * worth one star; one mistake and it is worth nothing, however long the homework was. Solo
 * practice and the classroom match award no stars — the first is unsupervised, and in the second
 * the teacher types the answers.
 *
 * The homework's topic does not matter. The teacher chooses it, so a child must not lose a star
 * because the homework they were set happened to be below their level group.
 */
export function calculateEarnedStars(results: readonly PracticeResult[], studentId: string): number {
  let stars = 0;

  for (const r of results) {
    if (r.studentId !== studentId) continue;
    if (r.mode !== 'online') continue;
    // A homework with no problems in it is not a perfect one, it is an empty one.
    if (r.total <= 0) continue;
    // An unreadable timestamp compares false and so still counts: a child's real work is never
    // dropped over a bad date.
    if (Date.parse(r.completedAt) < STARS_COUNTED_FROM_MS) continue;

    if (r.correct === r.total) stars += 1;
  }

  return stars;
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

/**
 * Every student's balance at once, keyed by student id. The teacher's roster needs the whole class,
 * and each balance is derived from the same result and order lists.
 */
export function computeStarsByStudent(
  students: readonly { id: string }[],
  results: readonly PracticeResult[],
  orders: readonly MarketOrder[],
): Map<string, StudentStarsBalance> {
  return new Map(
    students.map((student) => [student.id, computeStudentStars(student.id, results, orders)]),
  );
}

/**
 * An item's picture is either a real image — uploaded, linked, or inlined by the local backend —
 * or a single emoji standing in for one.
 */
export function isItemPhoto(imageUrl: string | null | undefined): boolean {
  return typeof imageUrl === 'string' && /^(https?:\/\/|data:image\/|blob:)/.test(imageUrl);
}

export function canAfford(balance: number, item: MarketItem): boolean {
  return balance >= item.costStars && (item.stock === null || item.stock > 0);
}
