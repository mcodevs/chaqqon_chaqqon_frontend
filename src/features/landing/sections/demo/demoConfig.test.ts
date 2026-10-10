import { describe, expect, it } from 'vitest';
import { problemFrames } from '@/domain/practice/abacus';
import { PRACTICE_LIMITS } from '@/domain/practice/config';
import { numberTiming } from '@/domain/practice/session';
import { createSeededRandom } from '@/domain/random';
import {
  DEFAULT_DEMO_SECTION,
  DEFAULT_DEMO_SPEED,
  DEMO_RODS,
  DEMO_ROW_COUNT,
  DEMO_SECTIONS,
  DEMO_SPEEDS,
  IDLE_GHOST_NUMBER,
  IDLE_TEASER_NUMBERS,
  IDLE_TEASER_STEP_MS,
  INITIAL_TALLY,
  MIN_DEMO_ANSWER,
  demoSpeedLabel,
  fasterSpeed,
  makeDemoProblem,
  slowerSpeed,
  tallyReducer,
} from './demoConfig';

describe('demo speeds', () => {
  it('stay inside the practice limits and never offer the fastest speeds', () => {
    const limits = PRACTICE_LIMITS.secondsPerNumber;
    for (const speed of DEMO_SPEEDS) {
      expect(speed).toBeGreaterThanOrEqual(limits.min);
      expect(speed).toBeLessThanOrEqual(limits.max);
      expect(speed).toBeGreaterThanOrEqual(0.7);
    }
    expect(DEMO_SPEEDS).toContain(DEFAULT_DEMO_SPEED);
    expect(DEMO_SECTIONS).toContain(DEFAULT_DEMO_SECTION);
  });

  it('change the screen fewer than three times a second', () => {
    for (const speed of DEMO_SPEEDS) {
      const { showMs, gapMs } = numberTiming(speed);
      expect(1000 / (showMs + gapMs)).toBeLessThan(3);
    }
  });

  it('step one notch at a time and stop at either end', () => {
    expect(fasterSpeed(1.5)).toBe(1);
    expect(fasterSpeed(1)).toBe(0.7);
    expect(fasterSpeed(0.7)).toBeNull();
    expect(slowerSpeed(0.7)).toBe(1);
    expect(slowerSpeed(1)).toBe(1.5);
    expect(slowerSpeed(1.5)).toBeNull();
    expect(fasterSpeed(0.3)).toBeNull();
    expect(slowerSpeed(6)).toBeNull();
  });

  it('are written with the decimal comma', () => {
    expect(DEMO_SPEEDS.map(demoSpeedLabel)).toEqual(['1,5 s', '1 s', '0,7 s']);
  });
});

describe('demo problems', () => {
  it('are four one-digit rows that never dip below zero, never sum to zero and replay on three rods', () => {
    for (const section of DEMO_SECTIONS) {
      const random = createSeededRandom(2026 + section.length);
      for (let i = 0; i < 500; i++) {
        const problem = makeDemoProblem(section, random);
        expect(problem.numbers).toHaveLength(DEMO_ROW_COUNT);
        expect(problem.numbers.every((value) => Math.abs(value) >= 1 && Math.abs(value) <= 9)).toBe(true);
        expect(problem.answer).toBe(problem.numbers.reduce((sum, value) => sum + value, 0));
        expect(problem.answer).toBeGreaterThanOrEqual(MIN_DEMO_ANSWER);

        let total = 0;
        for (const value of problem.numbers) {
          total += value;
          expect(total).toBeGreaterThanOrEqual(0);
        }

        const frames = problemFrames(problem.numbers, DEMO_RODS);
        expect(frames.at(-1)?.value).toBe(problem.answer);
      }
    }
  });
});

describe('idle teaser', () => {
  it('is over in under 2.5 seconds and comes to rest on the idle ghost', () => {
    expect(IDLE_TEASER_NUMBERS.length * IDLE_TEASER_STEP_MS).toBeLessThan(2500);
    expect(IDLE_TEASER_NUMBERS).toContain(IDLE_GHOST_NUMBER);
  });
});

describe('tallyReducer', () => {
  it('counts rounds, correct answers and the streak', () => {
    const after = [true, true, false, true].reduce(
      (tally, isCorrect) => tallyReducer(tally, { type: 'result', isCorrect, section: 'kichik' }),
      INITIAL_TALLY,
    );
    expect(after).toEqual({ rounds: 4, correct: 3, streak: 1, lastSection: 'kichik' });
  });

  it('starts the streak again on a wrong answer', () => {
    const twoRight = [true, true].reduce(
      (tally, isCorrect) => tallyReducer(tally, { type: 'result', isCorrect, section: 'formulasiz' }),
      INITIAL_TALLY,
    );
    expect(twoRight.streak).toBe(2);
    expect(tallyReducer(twoRight, { type: 'result', isCorrect: false, section: 'formulasiz' }).streak).toBe(
      0,
    );
  });

  it('remembers the section of the latest round, right or wrong', () => {
    const first = tallyReducer(INITIAL_TALLY, { type: 'result', isCorrect: true, section: 'formulasiz' });
    const second = tallyReducer(first, { type: 'result', isCorrect: false, section: 'katta' });
    expect(first.lastSection).toBe('formulasiz');
    expect(second.lastSection).toBe('katta');
    expect(INITIAL_TALLY).toEqual({ rounds: 0, correct: 0, streak: 0, lastSection: null });
  });
});
