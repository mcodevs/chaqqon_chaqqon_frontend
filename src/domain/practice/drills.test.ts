import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../random';
import { DEFAULT_PRACTICE_CONFIG, DEFAULT_SOROBAN_CONFIG, type PracticeConfig } from './config';
import { generateDrillProblems, generateSorobanProblems, sorobanRods } from './drills';

const soroban = (overrides: Partial<PracticeConfig> = {}): PracticeConfig => ({
  ...DEFAULT_SOROBAN_CONFIG,
  ...overrides,
});

describe('sorobanRods', () => {
  it('never draws fewer rods than a small abacus has', () => {
    expect(sorobanRods(1)).toBe(3);
    expect(sorobanRods(3)).toBe(3);
  });

  it('grows with the number', () => {
    expect(sorobanRods(4)).toBe(4);
    expect(sorobanRods(5)).toBe(5);
  });
});

describe('generateSorobanProblems', () => {
  it('makes one card per problem, each its own answer', () => {
    const problems = generateSorobanProblems(soroban({ problemCount: 7 }), createSeededRandom(1));

    expect(problems).toHaveLength(7);
    for (const problem of problems) {
      expect(problem.numbers).toEqual([problem.answer]);
    }
  });

  it.each([
    [1, 1, 9],
    [2, 10, 99],
    [3, 100, 999],
    [5, 10_000, 99_999],
  ])('keeps %i-digit cards inside their range', (digitCount, min, max) => {
    const problems = generateSorobanProblems(
      soroban({ digitCount, problemCount: 30 }),
      createSeededRandom(digitCount),
    );

    for (const problem of problems) {
      expect(problem.answer).toBeGreaterThanOrEqual(min);
      expect(problem.answer).toBeLessThanOrEqual(max);
    }
  });

  it('never shows the same card twice in a row', () => {
    // One-digit cards have only nine values, so repeats are all but certain without the rule.
    const problems = generateSorobanProblems(
      soroban({ digitCount: 1, problemCount: 30 }),
      createSeededRandom(7),
    );

    for (let index = 1; index < problems.length; index += 1) {
      expect(problems[index].answer).not.toBe(problems[index - 1].answer);
    }
  });

  it('is deterministic for a given random source', () => {
    const config = soroban();
    const first = generateSorobanProblems(config, createSeededRandom(42));
    const second = generateSorobanProblems(config, createSeededRandom(42));

    expect(first).toEqual(second);
  });
});

describe('generateDrillProblems', () => {
  it('reads one number per card for the soroban drill', () => {
    const problems = generateDrillProblems(soroban({ problemCount: 5 }), createSeededRandom(3));

    expect(problems).toHaveLength(5);
    expect(problems.every((problem) => problem.numbers.length === 1)).toBe(true);
  });

  it('still builds anzan problems with several rows', () => {
    const problems = generateDrillProblems(
      { ...DEFAULT_PRACTICE_CONFIG, rowCount: 4, problemCount: 5 },
      createSeededRandom(3),
    );

    expect(problems).toHaveLength(5);
    expect(problems.every((problem) => problem.numbers.length === 4)).toBe(true);
  });
});
