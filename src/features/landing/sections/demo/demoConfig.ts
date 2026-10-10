import { DEFAULT_PRACTICE_CONFIG, type SectionId } from '@/domain/practice/config';
import { type Problem, generateProblem } from '@/domain/practice/problem';
import type { Random } from '@/domain/random';
import { formatSeconds } from '@/shared/format';

/*
 * The hero demo: one real flash-anzan round, played by a guest. Everything it needs to decide lives
 * here, away from the components, so tests can hold it to its limits: the speeds stay well under
 * three changes a second (WCAG 2.3.1), and every problem fits the three-rod replay abacus.
 */

/** Seconds per number, slowest first. 0.3 s is never offered to a first-time visitor. */
export const DEMO_SPEEDS = [1.5, 1, 0.7] as const;
export const DEFAULT_DEMO_SPEED = 1.5;

/** The sections a guest may try, easiest first; miks needs a teacher's introduction. */
export const DEMO_SECTIONS = ['formulasiz', 'kichik', 'katta'] as const satisfies readonly SectionId[];
export type DemoSection = (typeof DEMO_SECTIONS)[number];
export const DEFAULT_DEMO_SECTION: DemoSection = 'formulasiz';

/** Numbers in one round: the same as a student's first session. */
export const DEMO_ROW_COUNT = DEFAULT_PRACTICE_CONFIG.rowCount;
/** Rods on the replay abacus; one-digit rounds of these sections never climb past them. */
export const DEMO_RODS = 3;

/** A zero-sum round ends on an empty abacus and a lone "0" mascot: a flat first impression. */
export const MIN_DEMO_ANSWER = 1;

export function makeDemoProblem(section: SectionId, random: Random): Problem {
  const shape = { section, rowCount: DEMO_ROW_COUNT, digitCount: 1 };
  let problem = generateProblem(shape, random);
  // About one formulasiz round in nine sums to zero; a few redraws all but rule it out, and the cap keeps it finite.
  for (let tries = 1; problem.answer < MIN_DEMO_ANSWER && tries < 50; tries++) {
    problem = generateProblem(shape, random);
  }
  return problem;
}

/** The next speed up, for "Tezroq"; null at the fastest. */
export function fasterSpeed(speed: number): number | null {
  const index = (DEMO_SPEEDS as readonly number[]).indexOf(speed);
  return index >= 0 && index < DEMO_SPEEDS.length - 1 ? DEMO_SPEEDS[index + 1] : null;
}

/** The next speed down, for "Sekinroq"; null at the slowest. */
export function slowerSpeed(speed: number): number | null {
  const index = (DEMO_SPEEDS as readonly number[]).indexOf(speed);
  return index > 0 ? DEMO_SPEEDS[index - 1] : null;
}

/** "1,5 s": a speed as its option and its buttons write it. */
export function demoSpeedLabel(speed: number): string {
  return `${formatSeconds(speed)} s`;
}

/*
 * The idle teaser (played once, only in view and with motion allowed): three ghost numbers, then
 * the stage rests on the ghost "+5" it shows when idle. Under 2.5 s in all.
 */
export const IDLE_GHOST_NUMBER = 5;
export const IDLE_TEASER_NUMBERS = [3, 5, -2] as const;
export const IDLE_TEASER_STEP_MS = 650;

/** The guest's own score, kept only in the page's memory: never stored, never sent. */
export interface DemoTally {
  rounds: number;
  correct: number;
  /** Correct answers in a row; a wrong one starts it again. */
  streak: number;
  /** The section of the latest round, for the teacher-panel preview; null before the first. */
  lastSection: SectionId | null;
}

export const INITIAL_TALLY: DemoTally = { rounds: 0, correct: 0, streak: 0, lastSection: null };

export type TallyAction = { type: 'result'; isCorrect: boolean; section: SectionId };

export function tallyReducer(state: DemoTally, action: TallyAction): DemoTally {
  switch (action.type) {
    case 'result':
      return {
        rounds: state.rounds + 1,
        correct: state.correct + (action.isCorrect ? 1 : 0),
        streak: action.isCorrect ? state.streak + 1 : 0,
        lastSection: action.section,
      };
  }
}
