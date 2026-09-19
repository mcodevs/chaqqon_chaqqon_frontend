import { type Random, pickOne, randomInt } from '../random';
import type { PracticeConfig, SectionId } from './config';
import { classifyMove } from './soroban';

export interface Problem {
  /** Signed rows; negative values are subtractions. */
  numbers: number[];
  answer: number;
}

type ProblemShape = Pick<PracticeConfig, 'section' | 'rowCount'> & Partial<Pick<PracticeConfig, 'digitCount'>>;

interface Draft {
  numbers: number[];
  /** Moves that practise the requested section. */
  hits: number;
}

const MAX_ATTEMPTS = 80;

const MOVES_BY_DIGIT_COUNT: Record<number, readonly number[]> = {
  1: [1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((digit) => [digit, -digit]),
  2: Array.from({ length: 90 }, (_, i) => i + 10).flatMap((n) => [n, -n]),
  3: Array.from({ length: 900 }, (_, i) => i + 100).flatMap((n) => [n, -n]),
};

const OPENINGS: Record<Exclude<SectionId, 'miks'>, readonly number[]> = {
  formulasiz: [1, 2, 3, 4, 5, 6, 7, 8, 9],
  // No 5-complement move exists from 9, so small-friend drills never open there.
  kichik: [1, 2, 3, 4, 5, 6, 7, 8],
  katta: [1, 2, 3, 4, 5, 6, 7, 8, 9],
};

/**
 * Builds a flash-anzan problem whose running total never goes negative and whose
 * moves genuinely practise the section; drafts with too few such moves are redone.
 */
export function generateProblem(shape: ProblemShape, random: Random): Problem {
  if (shape.rowCount < 2) throw new RangeError('A problem needs at least two rows');

  const required = requiredHits(shape);
  let best = draftProblem(shape, random);

  for (let attempt = 1; attempt < MAX_ATTEMPTS && best.hits < required; attempt++) {
    const draft = draftProblem(shape, random);
    if (draft.hits > best.hits) best = draft;
  }

  return { numbers: best.numbers, answer: best.numbers.reduce((sum, value) => sum + value, 0) };
}

export function generateProblems(config: PracticeConfig, random: Random): Problem[] {
  return Array.from({ length: config.problemCount }, () => generateProblem(config, random));
}

function initialNumbers(section: SectionId, digitCount: number, random: Random): number[] {
  if (digitCount === 1) {
    if (section === 'miks') return miksOpening(random);
    return [pickOne(random, OPENINGS[section])];
  }
  const min = Math.pow(10, digitCount - 1);
  const max = Math.pow(10, digitCount) - 1;
  return [randomInt(random, min, max)];
}

function draftProblem(shape: ProblemShape, random: Random): Draft {
  const digitCount = shape.digitCount ?? 1;
  const numbers = initialNumbers(shape.section, digitCount, random);
  let total = numbers.reduce((sum, value) => sum + value, 0);
  let hits = numbers.length - 1; // the miks opening move is a family move by construction

  const moves = MOVES_BY_DIGIT_COUNT[digitCount] ?? MOVES_BY_DIGIT_COUNT[1];

  while (numbers.length < shape.rowCount) {
    const valid = moves.filter((value) => total + value >= 0);
    const matching = valid.filter((value) => classifyMove(total, value) === shape.section);
    const value = pickOne(random, matching.length > 0 ? matching : valid);

    if (matching.length > 0) hits++;
    numbers.push(value);
    total += value;
  }

  return { numbers, hits };
}

function requiredHits({ section, rowCount, digitCount = 1 }: ProblemShape): number {
  const moves = rowCount - 1;
  if (digitCount === 1) {
    switch (section) {
      case 'formulasiz':
      case 'kichik':
        return moves;
      case 'katta':
        return Math.max(1, Math.ceil(moves * 0.6));
      case 'miks':
        return 1;
    }
  }
  switch (section) {
    case 'formulasiz':
      return moves;
    case 'kichik':
      return Math.max(1, Math.ceil(moves * 0.8));
    case 'katta':
      return Math.max(1, Math.ceil(moves * 0.6));
    case 'miks':
      return 1;
  }
}

/**
 * A family move needs a column already sitting on a formula boundary (tens digit 4, 5 or 9),
 * which a walk from a single digit almost never reaches, so the problem opens right there.
 */
function miksOpening(random: Random): number[] {
  if (random() < 0.5) {
    const tens = random() < 0.5 ? 4 : 9;
    const units = randomInt(random, 1, 9);
    // units + value ≥ 10 carries into the 4 (needs +5−4) or the 9 (cascades).
    return [tens * 10 + units, randomInt(random, 10 - units, 9)];
  }
  const units = randomInt(random, 0, 8);
  // value > units borrows from the 5, which then needs −5+4.
  return [50 + units, -randomInt(random, units + 1, 9)];
}
