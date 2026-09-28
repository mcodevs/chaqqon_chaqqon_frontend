import { type Random, randomInt } from '../random';
import { MIN_RODS } from './abacus';
import type { PracticeConfig } from './config';
import { type Problem, generateProblems } from './problem';

/*
 * The two drills a session can run, behind one call. `problem.ts` builds the anzan drill —
 * signed numbers whose sum is the answer. This file adds the reading drill: one soroban is
 * flashed and the child says which number stands on it, so a card is a single number that
 * is its own answer. Both come out as `Problem`, which is what the session reducer runs.
 */

/** Rods a `digitCount`-digit card is drawn on; never fewer than the smallest real abacus has. */
export function sorobanRods(digitCount: number): number {
  return Math.max(MIN_RODS, digitCount);
}

/** Numbers with exactly `digitCount` digits. One-digit cards skip 0: an empty abacus reads as broken. */
function cardRange(digitCount: number): { min: number; max: number } {
  return {
    min: digitCount === 1 ? 1 : 10 ** (digitCount - 1),
    max: 10 ** digitCount - 1,
  };
}

/**
 * Cards for the reading drill. No card repeats the one before it, so a flash that looks
 * unchanged never is — the child always reads a new abacus.
 */
export function generateSorobanProblems(config: PracticeConfig, random: Random): Problem[] {
  const { min, max } = cardRange(config.digitCount);
  const problems: Problem[] = [];
  let previous: number | null = null;

  for (let index = 0; index < config.problemCount; index += 1) {
    let value = randomInt(random, min, max);
    if (value === previous) value = value === max ? min : value + 1;
    previous = value;
    problems.push({ numbers: [value], answer: value });
  }

  return problems;
}

/** The problems a config asks for, whichever drill it describes. */
export function generateDrillProblems(config: PracticeConfig, random: Random): Problem[] {
  return config.kind === 'soroban'
    ? generateSorobanProblems(config, random)
    : generateProblems(config, random);
}
