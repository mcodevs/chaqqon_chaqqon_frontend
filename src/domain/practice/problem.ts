import { type Random, pickOne, randomInt } from '../random';
import type { PracticeConfig, SectionId } from './config';
import { classifyMove, describeMove } from './soroban';
import { type Topic, allowedByTopic, getTopic, matchesTopic, topicMaxTotal } from './topics';

export interface Problem {
  /** Signed rows; negative values are subtractions. */
  numbers: number[];
  answer: number;
}

type ProblemShape = Pick<PracticeConfig, 'section' | 'rowCount'> &
  Partial<Pick<PracticeConfig, 'digitCount' | 'topicId'>>;

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

  const topic = getTopic(shape.topicId);
  const digitCount = shape.digitCount ?? 1;
  const draw = topic
    ? () => draftTopicProblem(topic, digitCount, shape.rowCount, random)
    : () => draftProblem(shape, random);
  const required = topic ? requiredTopicHits(topic, shape.rowCount) : requiredHits(shape);

  let best = draw();
  for (let attempt = 1; attempt < MAX_ATTEMPTS && best.hits < required; attempt++) {
    const draft = draw();
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

/*
 * Topic drills (see topics.ts) walk the same way as section drills, but every candidate row is read
 * with `describeMove`, so the walk can tell the drilled move from the rows that merely set it up.
 * Candidates are sampled rather than fully enumerated — the three-digit move list is 1800 long and
 * a draft may be redone dozens of times.
 */
const CANDIDATE_LIMIT = 48;
const CANDIDATE_TRIES = 200;
const LOOKAHEAD_TRIES = 40;

function draftTopicProblem(topic: Topic, requestedDigits: number, rowCount: number, random: Random): Draft {
  const digitCount = topic.digitCounts.includes(requestedDigits) ? requestedDigits : topic.digitCounts[0];
  const moves = MOVES_BY_DIGIT_COUNT[digitCount];
  const maxTotal = topicMaxTotal(topic, digitCount);

  const numbers = [topicOpening(digitCount, maxTotal, random)];
  let total = numbers[0];
  let hits = 0;

  while (numbers.length < rowCount) {
    const { matching, others } = scanMoves(topic, total, moves, maxTotal, random);
    let value: number;

    if (matching.length > 0) {
      value = pickOne(random, matching);
      hits++;
    } else if (others.length > 0) {
      // Prefer a row that brings the drilled move within reach on the next step.
      const setups = others.filter((move) => hasTargetAfter(topic, total + move, moves, maxTotal, random));
      value = pickOne(random, setups.length > 0 ? setups : others);
    } else {
      const escape = anyMove(total, moves, maxTotal, random);
      if (escape === null) break;
      value = escape;
    }

    numbers.push(value);
    total += value;
  }

  return { numbers, hits };
}

function topicOpening(digitCount: number, maxTotal: number, random: Random): number {
  const min = digitCount === 1 ? 1 : 10 ** (digitCount - 1);
  const max = Math.min(10 ** digitCount - 1, maxTotal);
  return randomInt(random, min, max);
}

function scanMoves(
  topic: Topic,
  total: number,
  moves: readonly number[],
  maxTotal: number,
  random: Random,
): { matching: number[]; others: number[] } {
  const matching: number[] = [];
  const others: number[] = [];

  for (let tries = 0; tries < CANDIDATE_TRIES; tries++) {
    if (matching.length + others.length >= CANDIDATE_LIMIT) break;
    const value = pickOne(random, moves);
    const next = total + value;
    if (next < 0 || next > maxTotal) continue;

    const facts = describeMove(total, value);
    if (!allowedByTopic(topic, facts)) continue;
    if (matchesTopic(topic, facts)) matching.push(value);
    else others.push(value);
  }

  return { matching, others };
}

function hasTargetAfter(
  topic: Topic,
  total: number,
  moves: readonly number[],
  maxTotal: number,
  random: Random,
): boolean {
  for (let tries = 0; tries < LOOKAHEAD_TRIES; tries++) {
    const value = pickOne(random, moves);
    const next = total + value;
    if (next < 0 || next > maxTotal) continue;
    const facts = describeMove(total, value);
    if (allowedByTopic(topic, facts) && matchesTopic(topic, facts)) return true;
  }
  return false;
}

/** Last resort when the pool has no legal row left: keep the problem the requested length. */
function anyMove(total: number, moves: readonly number[], maxTotal: number, random: Random): number | null {
  for (let tries = 0; tries < CANDIDATE_TRIES; tries++) {
    const value = pickOne(random, moves);
    const next = total + value;
    if (next >= 0 && next <= maxTotal) return value;
  }
  return null;
}

function requiredTopicHits(topic: Topic, rowCount: number): number {
  const moves = rowCount - 1;
  if (topic.target.crossing !== undefined || topic.target.technique === 'mix') return 1;
  if (topic.target.technique === 'big10') return Math.max(1, Math.ceil(moves * 0.4));
  if (topic.target.technique === 'small5') return Math.max(1, Math.ceil(moves * 0.5));
  return Math.max(1, Math.ceil(moves * 0.6));
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
