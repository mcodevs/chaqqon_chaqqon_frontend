import { type PracticeResult, accuracyPercent } from './results';
import type { Student } from './users';

export interface LeaderboardRow {
  student: Student;
  sessions: number;
  correct: number;
  total: number;
  accuracy: number;
}

/** Ranks by accuracy, then by number of sessions; students without sessions go last. */
export function computeLeaderboard(
  students: readonly Student[],
  results: readonly PracticeResult[],
): LeaderboardRow[] {
  const rows = new Map<string, LeaderboardRow>(
    students.map((student) => [student.id, { student, sessions: 0, correct: 0, total: 0, accuracy: 0 }]),
  );

  for (const result of results) {
    const row = rows.get(result.studentId);
    if (!row) continue;
    row.sessions += 1;
    row.correct += result.correct;
    row.total += result.total;
  }

  return [...rows.values()]
    .map((row) => ({ ...row, accuracy: accuracyPercent(row.correct, row.total) }))
    .sort((a, b) => {
      if ((a.sessions === 0) !== (b.sessions === 0)) return a.sessions === 0 ? 1 : -1;
      return b.accuracy - a.accuracy || b.sessions - a.sessions;
    });
}
