import { describe, expect, it } from 'vitest';
import { computeLeaderboard } from './leaderboard';
import { DEFAULT_PRACTICE_CONFIG } from './practice/config';
import type { PracticeResult } from './results';
import type { Student } from './users';

const student = (id: string): Student => ({ id, firstName: id, lastName: '' });

const result = (studentId: string, correct: number, total = 10): PracticeResult => ({
  id: `${studentId}-${correct}-${Math.random()}`,
  studentId,
  completedAt: '2026-01-01T00:00:00.000Z',
  config: DEFAULT_PRACTICE_CONFIG,
  correct,
  total,
  mode: 'practice',
  roomId: null,
});

describe('computeLeaderboard', () => {
  it('orders by points, with inactive students last', () => {
    const rows = computeLeaderboard(
      [student('idle'), student('a'), student('b'), student('c')],
      [result('a', 8), result('b', 9), result('c', 8), result('c', 8), result('ghost', 10)],
    );

    expect(rows.map((row) => row.student.id)).toEqual(['c', 'b', 'a', 'idle']);
    expect(rows[0]).toMatchObject({ sessions: 2, correct: 16, total: 20, accuracy: 80 });
    expect(rows[3]).toMatchObject({ sessions: 0, accuracy: 0 });
  });

  it('does not let one perfect problem outrank sustained practice', () => {
    const rows = computeLeaderboard(
      [student('grinder'), student('sniper')],
      [
        ...Array.from({ length: 10 }, () => result('grinder', 9)),
        result('sniper', 1, 1),
      ],
    );

    expect(rows.map((row) => row.student.id)).toEqual(['grinder', 'sniper']);
    expect(rows[0]).toMatchObject({ correct: 90, accuracy: 90 });
    expect(rows[1]).toMatchObject({ correct: 1, accuracy: 100 });
  });

  it('breaks a points tie by accuracy, so wasted attempts cost a place', () => {
    const rows = computeLeaderboard(
      [student('sloppy'), student('sharp')],
      [result('sloppy', 8, 20), result('sharp', 8, 10)],
    );

    expect(rows.map((row) => row.student.id)).toEqual(['sharp', 'sloppy']);
  });
});
