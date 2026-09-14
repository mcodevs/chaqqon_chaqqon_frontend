import type { Problem } from './problem';

export type SessionPhase = 'ready' | 'showing' | 'gap' | 'answering' | 'feedback' | 'finished';

/** Phases during which numbers are being flashed. */
export type FlashPhase = Extract<SessionPhase, 'ready' | 'showing' | 'gap'>;

/** Pauses around the flashed numbers, in milliseconds. */
export const SESSION_TIMING = {
  /** "Tayyor turing…" before every problem. */
  readyMs: 900,
  /** Blank screen between numbers, so two equal numbers in a row are still noticed. */
  maxGapMs: 200,
  /** With auto-advance, correct answers move on by themselves after this pause. */
  correctFeedbackMs: 1300,
} as const;

/** The blank never takes more than this share of a number's time, so fast numbers stay readable. */
const MAX_GAP_SHARE = 0.25;

export interface ProblemAttempt {
  problem: Problem;
  /** null when no answer was given. */
  answer: number | null;
  isCorrect: boolean;
}

/**
 * One participant's column. Solo practice has a single lane; a classroom match has one
 * lane per student, each flashing its own numbers in step with the others.
 */
export interface Lane {
  problems: readonly Problem[];
  attempts: readonly ProblemAttempt[];
}

export interface SessionState {
  phase: SessionPhase;
  lanes: readonly Lane[];
  /** Index of the current problem, shared by every lane. */
  round: number;
  /** Index of the number being flashed (or just flashed, during a gap). */
  numberIndex: number;
}

export type SessionAction =
  | { type: 'readyElapsed' }
  | { type: 'numberElapsed' }
  | { type: 'gapElapsed' }
  | { type: 'answersSubmitted'; answers: readonly (number | null)[] }
  | { type: 'nextRequested' };

export interface TimedTransition {
  delayMs: number;
  action: SessionAction;
}

export interface TimingOptions {
  /** Time from one number to the next. */
  secondsPerNumber: number;
  /** After feedback, move on by itself when every lane answered correctly. */
  autoAdvance: boolean;
}

export interface NumberTiming {
  /** How long a number stays on screen. */
  showMs: number;
  /** The blank screen after it. */
  gapMs: number;
}

/** Every lane must have the same number of problems, with the same number of rows per round. */
export function createSession(problemSets: readonly (readonly Problem[])[]): SessionState {
  const [first] = problemSets;
  if (!first || first.length === 0) {
    throw new Error('A session needs at least one lane with problems');
  }
  const inStep = problemSets.every(
    (problems) =>
      problems.length === first.length &&
      problems.every((problem, round) => problem.numbers.length === first[round].numbers.length),
  );
  if (!inStep) {
    throw new Error('Every lane needs the same number of problems and rows');
  }
  return {
    phase: 'ready',
    lanes: problemSets.map((problems) => ({ problems, attempts: [] })),
    round: 0,
    numberIndex: 0,
  };
}

export function roundCount(state: SessionState): number {
  return state.lanes[0].problems.length;
}

export function currentProblem(state: SessionState, lane = 0): Problem {
  return state.lanes[lane].problems[state.round];
}

export function lastAttempt(state: SessionState, lane = 0): ProblemAttempt | undefined {
  return state.lanes[lane].attempts.at(-1);
}

export function countCorrect(state: SessionState, lane = 0): number {
  return state.lanes[lane].attempts.filter((attempt) => attempt.isCorrect).length;
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'readyElapsed':
      return state.phase === 'ready' ? { ...state, phase: 'showing' } : state;

    case 'numberElapsed': {
      if (state.phase !== 'showing') return state;
      const isLastNumber = state.numberIndex >= currentProblem(state).numbers.length - 1;
      return { ...state, phase: isLastNumber ? 'answering' : 'gap' };
    }

    case 'gapElapsed':
      return state.phase === 'gap'
        ? { ...state, phase: 'showing', numberIndex: state.numberIndex + 1 }
        : state;

    case 'answersSubmitted': {
      if (state.phase !== 'answering' || action.answers.length !== state.lanes.length) return state;
      const lanes = state.lanes.map((lane, index) => {
        const problem = lane.problems[state.round];
        const answer = action.answers[index];
        return {
          ...lane,
          attempts: [...lane.attempts, { problem, answer, isCorrect: answer === problem.answer }],
        };
      });
      return { ...state, phase: 'feedback', lanes };
    }

    case 'nextRequested': {
      if (state.phase !== 'feedback') return state;
      const isLastRound = state.round >= roundCount(state) - 1;
      return isLastRound
        ? { ...state, phase: 'finished' }
        : { ...state, phase: 'ready', round: state.round + 1, numberIndex: 0 };
    }
  }
}

/**
 * Splits `secondsPerNumber`, the time from one number to the next, into the number and the blank
 * after it. The blank lasts `SESSION_TIMING.maxGapMs` at most and a quarter of the time at fast
 * speeds: at 0.3 s a number shows for 225 ms, then the screen is blank for 75 ms.
 */
export function numberTiming(secondsPerNumber: number): NumberTiming {
  const totalMs = Math.round(secondsPerNumber * 1000);
  const gapMs = Math.min(SESSION_TIMING.maxGapMs, Math.round(totalMs * MAX_GAP_SHARE));
  return { showMs: totalMs - gapMs, gapMs };
}

/** The step the current phase advances to on its own, or null when it waits for a person. */
export function timedTransition(
  state: SessionState,
  { secondsPerNumber, autoAdvance }: TimingOptions,
): TimedTransition | null {
  switch (state.phase) {
    case 'ready':
      return { delayMs: SESSION_TIMING.readyMs, action: { type: 'readyElapsed' } };
    case 'showing':
      return { delayMs: numberTiming(secondsPerNumber).showMs, action: { type: 'numberElapsed' } };
    case 'gap':
      return { delayMs: numberTiming(secondsPerNumber).gapMs, action: { type: 'gapElapsed' } };
    case 'feedback': {
      const allCorrect = state.lanes.every((_, lane) => lastAttempt(state, lane)?.isCorrect);
      return autoAdvance && allCorrect
        ? { delayMs: SESSION_TIMING.correctFeedbackMs, action: { type: 'nextRequested' } }
        : null;
    }
    case 'answering':
    case 'finished':
      return null;
  }
}
