import { describe, expect, it } from 'vitest';
import { computeLeaderboard } from './leaderboard';
import { DEFAULT_PRACTICE_CONFIG } from './practice/config';
import type { PracticeResult } from './results';
import type { Student } from './users';

const student = (id: string): Student => ({ id, firstName: id, lastName: '', age: null });

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
  it('orders by accuracy, then sessions, with inactive students last', () => {
    const rows = computeLeaderboard(
      [student('idle'), student('a'), student('b'), student('c')],
      [result('a', 8), result('b', 9), result('c', 8), result('c', 8), result('ghost', 10)],
    );

    expect(rows.map((row) => row.student.id)).toEqual(['b', 'c', 'a', 'idle']);
    expect(rows[1]).toMatchObject({ sessions: 2, correct: 16, total: 20, accuracy: 80 });
    expect(rows[3]).toMatchObject({ sessions: 0, accuracy: 0 });
  });
});
