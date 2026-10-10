import { describe, expect, it } from 'vitest';
import {
  STUDENT_COUNT_OPTIONS,
  cheapestFitting,
  fitsStudents,
  perStudentPrice,
  showStudentsChooser,
} from './pricing';

const tariff = (id: string, monthlyPrice: number, maxStudents: number | null) => ({
  id,
  monthlyPrice,
  maxStudents,
});

describe('showStudentsChooser', () => {
  it('asks only when two offered tariffs differ in their student limit', () => {
    expect(showStudentsChooser(undefined)).toBe(false);
    expect(showStudentsChooser([])).toBe(false);
    expect(showStudentsChooser([tariff('a', 100_000, 20)])).toBe(false);
    expect(showStudentsChooser([tariff('a', 100_000, 20), tariff('b', 150_000, 20)])).toBe(false);
    expect(showStudentsChooser([tariff('a', 100_000, 20), tariff('b', 150_000, 50)])).toBe(true);
  });

  it('counts "no limit" as a limit of its own', () => {
    expect(showStudentsChooser([tariff('a', 100_000, 20), tariff('b', 150_000, null)])).toBe(true);
    expect(showStudentsChooser([tariff('a', 100_000, null), tariff('b', 150_000, null)])).toBe(false);
  });
});

describe('fitsStudents', () => {
  it('fits up to the limit, and always without one', () => {
    expect(fitsStudents(tariff('a', 0, 20), 20)).toBe(true);
    expect(fitsStudents(tariff('a', 0, 20), 21)).toBe(false);
    expect(fitsStudents(tariff('a', 0, null), 10_000)).toBe(true);
  });
});

describe('cheapestFitting', () => {
  const tariffs = [tariff('start', 100_000, 20), tariff('pro', 150_000, 50), tariff('max', 250_000, null)];

  it('picks the cheapest tariff the class fits', () => {
    expect(cheapestFitting(tariffs, 10)).toBe('start');
    expect(cheapestFitting(tariffs, 30)).toBe('pro');
    expect(cheapestFitting(tariffs, 80)).toBe('max');
  });

  it('gives a tie to the tariff offered first', () => {
    const tied = [tariff('first', 150_000, 50), tariff('second', 150_000, 50)];
    expect(cheapestFitting(tied, 30)).toBe('first');
  });

  it('is null when no tariff fits', () => {
    expect(cheapestFitting([tariff('start', 100_000, 20)], 30)).toBeNull();
    expect(cheapestFitting([], 10)).toBeNull();
  });
});

describe('perStudentPrice', () => {
  it('splits the month over the chosen class size', () => {
    expect(perStudentPrice(tariff('pro', 150_000, 50), 20)).toBe(7_500);
  });

  it('says nothing without a size, for a class that does not fit, or for a free tariff', () => {
    expect(perStudentPrice(tariff('pro', 150_000, 50), null)).toBeNull();
    expect(perStudentPrice(tariff('start', 100_000, 20), 30)).toBeNull();
    expect(perStudentPrice(tariff('free', 0, null), 20)).toBeNull();
  });

  it('has a figure for every chip on a tariff without a limit', () => {
    for (const students of STUDENT_COUNT_OPTIONS)
      expect(perStudentPrice(tariff('max', 250_000, null), students)).toBeGreaterThan(0);
  });
});
