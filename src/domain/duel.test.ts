import { describe, expect, it } from 'vitest';
import {
  type DuelParticipant,
  type Duel,
  DUEL_IDLE_MS,
  alignDuelConfigs,
  generateDuelProblems,
  hasAnsweredRound,
  isDuelStale,
  isValidDuelSize,
  rankDuel,
} from './duel';
import { DEFAULT_PRACTICE_CONFIG, DEFAULT_SOROBAN_CONFIG, type PracticeConfig } from './practice/config';
import { createSeededRandom } from './random';

const player = (studentId: string, correct: number, answerMs: number, answered = 5): DuelParticipant => ({
  duelId: 'd1',
  studentId,
  joinedAt: '2026-10-16T10:00:00.000Z',
  answered,
  correct,
  answerMs,
});

const duel = (overrides: Partial<Duel> = {}): Duel => ({
  id: 'd1',
  hostId: 'ali',
  status: 'running',
  invitedIds: ['ali', 'vali'],
  configs: { ali: DEFAULT_PRACTICE_CONFIG, vali: DEFAULT_PRACTICE_CONFIG },
  problems: { ali: [], vali: [] },
  sameConfig: true,
  roundCount: 5,
  round: 2,
  createdAt: '2026-10-16T10:00:00.000Z',
  startedAt: '2026-10-16T10:00:10.000Z',
  finishedAt: null,
  updatedAt: '2026-10-16T10:00:10.000Z',
  ...overrides,
});

describe('duel places', () => {
  it('ranks by correct answers, and a tie by the time spent answering', () => {
    const places = rankDuel([player('slow', 4, 20_000), player('quick', 4, 9_000), player('weak', 2, 5_000)]);
    expect(places.map((place) => [place.studentId, place.place])).toEqual([
      ['quick', 1],
      ['slow', 2],
      ['weak', 3],
    ]);
  });

  it('shares a place between results that match in both', () => {
    const places = rankDuel([player('a', 3, 7_000), player('b', 3, 7_000), player('c', 1, 1_000)]);
    expect(places.map((place) => place.place)).toEqual([1, 1, 3]);
  });

  it('never splits a score of zero by time: answering nothing quickly is not better', () => {
    const places = rankDuel([player('left', 0, 0), player('tried', 0, 30_000)]);
    expect(places.map((place) => place.place)).toEqual([1, 1]);
  });
});

describe('a duel nobody drives', () => {
  it('goes stale once it has been left alone, and a finished one never does', () => {
    const started = new Date('2026-10-16T10:00:10.000Z');
    const late = new Date(started.getTime() + DUEL_IDLE_MS + 1000);
    expect(isDuelStale(duel(), started)).toBe(false);
    expect(isDuelStale(duel(), late)).toBe(true);
    expect(isDuelStale(duel({ status: 'finished' }), late)).toBe(false);
  });
});

describe('a duel in step', () => {
  it('counts the host plus at least one classmate, and at most eight in all', () => {
    expect([1, 2, 8, 9].map(isValidDuelSize)).toEqual([false, true, true, false]);
  });

  it('sees who has already answered the round everyone is on', () => {
    const running = duel({ round: 2 });
    expect(hasAnsweredRound(player('a', 1, 1000, 3), running)).toBe(true);
    expect(hasAnsweredRound(player('b', 1, 1000, 2), running)).toBe(false);
  });

  it('gives every player the same drill and the same number of problems', () => {
    const slow: PracticeConfig = { ...DEFAULT_PRACTICE_CONFIG, rowCount: 3, secondsPerNumber: 2 };
    const host: PracticeConfig = { ...DEFAULT_SOROBAN_CONFIG, problemCount: 12 };
    const aligned = alignDuelConfigs({ ali: host, vali: slow }, host);

    expect(aligned.vali.kind).toBe('soroban');
    expect(aligned.vali.problemCount).toBe(12);
    // The difficulty is the child's own: only what the rounds need is shared.
    expect(aligned.vali.secondsPerNumber).toBe(2);
  });

  it('clamps a problem count the drill does not allow', () => {
    // An anzan session is at most ten problems, however many cards the host asked for.
    const aligned = alignDuelConfigs({ ali: DEFAULT_PRACTICE_CONFIG }, { kind: 'anzan', problemCount: 30 });
    expect(aligned.ali.problemCount).toBe(10);
  });
});

describe("a duel's problems", () => {
  it('gives everyone the very same numbers when the settings are shared', () => {
    const configs = { ali: DEFAULT_PRACTICE_CONFIG, vali: DEFAULT_PRACTICE_CONFIG };
    const problems = generateDuelProblems(configs, true, createSeededRandom(7));
    expect(problems.ali).toEqual(problems.vali);
    expect(problems.ali).toHaveLength(DEFAULT_PRACTICE_CONFIG.problemCount);
  });

  it('draws for each child on their own when they play their own settings', () => {
    const configs = {
      ali: DEFAULT_PRACTICE_CONFIG,
      vali: { ...DEFAULT_PRACTICE_CONFIG, rowCount: 6 },
    };
    const problems = generateDuelProblems(configs, false, createSeededRandom(7));
    expect(problems.ali[0].numbers).toHaveLength(4);
    expect(problems.vali[0].numbers).toHaveLength(6);
  });
});
