import { type Tariff, pricePerStudent } from '@/domain/teacherBilling';

/*
 * The tariff section's "Nechta o'quvchingiz bor?" helper. It only ever adds facts to the cards
 * (what a student costs, which tariff fits, which is the cheapest that fits); it never re-sorts
 * them and never turns into a "from X so'm per child" headline.
 */

/** The class sizes a teacher can pick, as chips. */
export const STUDENT_COUNT_OPTIONS = [10, 20, 30, 50] as const;

/**
 * Whether the class-size question helps at all: it needs two offered tariffs that differ in their
 * student limit (no limit counts as a limit of its own).
 */
export function showStudentsChooser(tariffs: readonly Pick<Tariff, 'maxStudents'>[] | undefined): boolean {
  if (!tariffs || tariffs.length < 2) return false;
  return new Set(tariffs.map((tariff) => tariff.maxStudents)).size >= 2;
}

/** Whether a class of `students` fits the tariff; a tariff without a limit fits every class. */
export function fitsStudents(tariff: Pick<Tariff, 'maxStudents'>, students: number): boolean {
  return tariff.maxStudents === null || students <= tariff.maxStudents;
}

/**
 * The cheapest tariff a class of `students` fits, by id; on a tie the one offered first wins.
 * Tariffs come in the order they are offered (sortOrder). Null when none fits.
 */
export function cheapestFitting(
  tariffs: readonly Pick<Tariff, 'id' | 'monthlyPrice' | 'maxStudents'>[],
  students: number,
): string | null {
  let best: Pick<Tariff, 'id' | 'monthlyPrice'> | null = null;
  for (const tariff of tariffs) {
    if (fitsStudents(tariff, students) && (best === null || tariff.monthlyPrice < best.monthlyPrice))
      best = tariff;
  }
  return best?.id ?? null;
}

/**
 * The card's "1 o'quvchiga oyiga taxminan …" figure for the chosen class size, or null when no size
 * is chosen, the class does not fit, or the tariff is free (there is nothing to split).
 */
export function perStudentPrice(
  tariff: Pick<Tariff, 'monthlyPrice' | 'maxStudents'>,
  students: number | null,
): number | null {
  if (students === null || !fitsStudents(tariff, students)) return null;
  const price = pricePerStudent(tariff.monthlyPrice, students);
  return price > 0 ? price : null;
}
