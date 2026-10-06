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

export type StarReason = 'homework' | 'purchase' | 'refund' | 'teacher_grant';

/**
 * One line of a student's star ledger. Stars used to be recomputed from the result history, which
 * meant every change to the rule rewrote what the children had already earned; now each star is a
 * row written by the database, saying what it came from.
 */
export interface StarAward {
  id: string;
  studentId: string;
  /** Positive for a star earned, negative for one spent. */
  delta: number;
  reason: StarReason;
  /** The homework that paid for it, when there is one. */
  sourceResultId: string | null;
  /** The order it was spent on or refunded from, when there is one. */
  sourceOrderId: string | null;
  note: string | null;
  createdAt: string;
}

/** Stars a student has been given, the spending left out. */
export function calculateEarnedStars(awards: readonly StarAward[], studentId: string): number {
  return sumDeltas(awards, studentId, (delta) => delta > 0);
}

/** Stars a student has spent, as a positive number — `Math.abs` so an empty ledger reads 0, not -0. */
export function calculateSpentStars(awards: readonly StarAward[], studentId: string): number {
  return Math.abs(sumDeltas(awards, studentId, (delta) => delta < 0));
}

function sumDeltas(
  awards: readonly StarAward[],
  studentId: string,
  keep: (delta: number) => boolean,
): number {
  let sum = 0;
  for (const award of awards) {
    if (award.studentId !== studentId) continue;
    if (keep(award.delta)) sum += award.delta;
  }
  return sum;
}

/**
 * Computes full star balance for a student.
 */
export function computeStudentStars(
  studentId: string,
  awards: readonly StarAward[],
): StudentStarsBalance {
  const earnedStars = calculateEarnedStars(awards, studentId);
  const spentStars = calculateSpentStars(awards, studentId);
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
  awards: readonly StarAward[],
): Map<string, StudentStarsBalance> {
  return new Map(students.map((student) => [student.id, computeStudentStars(student.id, awards)]));
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
