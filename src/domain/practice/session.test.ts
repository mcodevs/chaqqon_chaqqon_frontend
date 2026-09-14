import { describe, expect, it } from 'vitest';
import type { Problem } from './problem';
import {
  SESSION_TIMING,
  type SessionAction,
  type SessionState,
  countCorrect,
  createSession,
  lastAttempt,
  numberTiming,
  roundCount,
  sessionReducer,
  timedTransition,
} from './session';

const problems: Problem[] = [
  { numbers: [3, 1], answer: 4 },
  { numbers: [5, -2], answer: 3 },
];

const otherProblems: Problem[] = [
  { numbers: [2, 2], answer: 4 },
  { numbers: [9, -4], answer: 5 },
];

const READY: SessionAction = { type: 'readyElapsed' };
const NUMBER: SessionAction = { type: 'numberElapsed' };
const GAP: SessionAction = { type: 'gapElapsed' };
const NEXT: SessionAction = { type: 'nextRequested' };
const answers = (...values: (number | null)[]): SessionAction => ({
  type: 'answersSubmitted',
  answers: values,
});

/** Flashes both numbers of a two-row problem. */
const FLASH_TWO_NUMBERS = [READY, NUMBER, GAP, NUMBER];

const PRACTICE = { secondsPerNumber: 6, autoAdvance: true };
const CLASSROOM = { secondsPerNumber: 6, autoAdvance: false };

function play(state: SessionState, actions: SessionAction[]): SessionState {
  return actions.reduce(sessionReducer, state);
}

describe('sessionReducer', () => {
  it('opens with a ready pause and separates numbers with a gap', () => {
    let state = createSession([problems]);
    expect(state.phase).toBe('ready');

    state = sessionReducer(state, READY);
    expect(state).toMatchObject({ phase: 'showing', numberIndex: 0 });

    state = sessionReducer(state, NUMBER);
    expect(state).toMatchObject({ phase: 'gap', numberIndex: 0 });

    state = sessionReducer(state, GAP);
    expect(state).toMatchObject({ phase: 'showing', numberIndex: 1 });

    state = sessionReducer(state, NUMBER);
    expect(state.phase).toBe('answering');
  });

  it('records answers and moves to the next problem', () => {
    let state = play(createSession([problems]), [...FLASH_TWO_NUMBERS, answers(4)]);
    expect(state.phase).toBe('feedback');
    expect(lastAttempt(state)?.isCorrect).toBe(true);

    state = sessionReducer(state, NEXT);
    expect(state).toMatchObject({ phase: 'ready', round: 1, numberIndex: 0 });

    state = play(state, [...FLASH_TWO_NUMBERS, answers(7), NEXT]);
    expect(lastAttempt(state)?.isCorrect).toBe(false);
    expect(state.phase).toBe('finished');
    expect(countCorrect(state)).toBe(1);
  });

  it('keeps several lanes in step and scores each one', () => {
    let state = play(createSession([problems, otherProblems]), [...FLASH_TWO_NUMBERS, answers(4, null)]);
    expect(lastAttempt(state, 0)).toMatchObject({ answer: 4, isCorrect: true });
    expect(lastAttempt(state, 1)).toMatchObject({ answer: null, isCorrect: false });

    state = play(state, [NEXT, ...FLASH_TWO_NUMBERS, answers(2, 5), NEXT]);
    expect(state.phase).toBe('finished');
    expect(roundCount(state)).toBe(2);
    expect([countCorrect(state, 0), countCorrect(state, 1)]).toEqual([1, 1]);
  });

  it('needs an answer for every lane', () => {
    const answering = play(createSession([problems, otherProblems]), FLASH_TWO_NUMBERS);
    expect(sessionReducer(answering, answers(4))).toBe(answering);
  });

  it('ignores actions that do not fit the current phase', () => {
    const state = createSession([problems]);
    for (const action of [NUMBER, GAP, NEXT, answers(1)]) {
      expect(sessionReducer(state, action)).toBe(state);
    }
  });

  it('rejects empty or out-of-step lanes', () => {
    expect(() => createSession([])).toThrow();
    expect(() => createSession([[]])).toThrow();
    expect(() => createSession([problems, problems.slice(1)])).toThrow();
    expect(() => createSession([problems, [{ numbers: [1], answer: 1 }, problems[1]]])).toThrow();
  });
});

describe('numberTiming', () => {
  it('fits the blank inside the time per number', () => {
    expect(numberTiming(6)).toEqual({ showMs: 5800, gapMs: SESSION_TIMING.maxGapMs });
    expect(numberTiming(0.3)).toEqual({ showMs: 225, gapMs: 75 });
  });

  it('changes numbers exactly on time at every speed from 0.3 to 7 seconds', () => {
    for (let tenths = 3; tenths <= 70; tenths++) {
      const { showMs, gapMs } = numberTiming(tenths / 10);
      expect(showMs + gapMs).toBe(tenths * 100);
      expect(gapMs).toBeGreaterThan(0);
      expect(showMs).toBeGreaterThanOrEqual(3 * gapMs);
    }
  });
});

describe('timedTransition', () => {
  it('schedules the ready pause, each number and the gap between numbers', () => {
    const ready = createSession([problems]);
    expect(timedTransition(ready, PRACTICE)).toEqual({ delayMs: SESSION_TIMING.readyMs, action: READY });

    const showing = sessionReducer(ready, READY);
    expect(timedTransition(showing, PRACTICE)).toEqual({ delayMs: 5800, action: NUMBER });

    const gap = sessionReducer(showing, NUMBER);
    expect(timedTransition(gap, PRACTICE)).toEqual({ delayMs: 200, action: GAP });
  });

  it('in practice, moves on by itself only after a correct answer', () => {
    const answering = play(createSession([problems]), FLASH_TWO_NUMBERS);
    expect(timedTransition(answering, PRACTICE)).toBeNull();

    expect(timedTransition(sessionReducer(answering, answers(4)), PRACTICE)).toEqual({
      delayMs: SESSION_TIMING.correctFeedbackMs,
      action: NEXT,
    });
    expect(timedTransition(sessionReducer(answering, answers(5)), PRACTICE)).toBeNull();
  });

  it('in a classroom match, always waits for the teacher', () => {
    const answering = play(createSession([problems, otherProblems]), FLASH_TWO_NUMBERS);
    expect(timedTransition(sessionReducer(answering, answers(4, 4)), CLASSROOM)).toBeNull();
  });
});
