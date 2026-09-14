import { type Random, pickOne, randomInt } from '../random';
import type { PracticeConfig, SectionId } from './config';
import { classifyMove } from './soroban';

export interface Problem {
  /** Signed rows; negative values are subtractions. */
  numbers: number[];
  answer: number;
}

type ProblemShape = Pick<PracticeConfig, 'section' | 'rowCount'>;

interface Draft {
  numbers: number[];
  /** Moves that practise the requested section. */
  hits: number;
}

const MAX_ATTEMPTS = 80;

/** Every row after the opening is a single digit added or subtracted. */
const MOVES: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((digit) => [digit, -digit]);

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

function draftProblem({ section, rowCount }: ProblemShape, random: Random): Draft {
  const numbers = section === 'miks' ? miksOpening(random) : [pickOne(random, OPENINGS[section])];
  let total = numbers.reduce((sum, value) => sum + value, 0);
  let hits = numbers.length - 1; // the miks opening move is a family move by construction

  while (numbers.length < rowCount) {
    const valid = MOVES.filter((value) => total + value >= 0);
    const matching = valid.filter((value) => classifyMove(total, value) === section);
    const value = pickOne(random, matching.length > 0 ? matching : valid);

    if (matching.length > 0) hits++;
    numbers.push(value);
    total += value;
  }

  return { numbers, hits };
}

function requiredHits({ section, rowCount }: ProblemShape): number {
  const moves = rowCount - 1;
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
