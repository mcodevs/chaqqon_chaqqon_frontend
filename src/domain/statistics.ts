import type { CalendarDate } from './billing';
import { SECTION_IDS, type SectionId } from './practice/config';
import { type PracticeResult, accuracyPercent } from './results';
import type { Student } from './users';

export type TimeRange = 'week' | 'month' | 'all';

export interface SectionStats {
  section: SectionId;
  sessions: number;
  correct: number;
  total: number;
  accuracy: number;
}

export interface DailyActivity {
  date: CalendarDate;
  sessions: number;
  correct: number;
  total: number;
  accuracy: number;
}

export interface StudentStats {
  totalSessions: number;
  totalCorrect: number;
  totalProblems: number;
  accuracy: number;
  averageSecondsPerNumber: number;
  bySection: Record<SectionId, SectionStats>;
  dailyActivity: DailyActivity[];
}

export interface StudentSummaryRow {
  student: Student;
  stats: StudentStats;
}

export interface ClassroomStats {
  activeStudentsCount: number;
  totalSessions: number;
  totalCorrect: number;
  totalProblems: number;
  accuracy: number;
  students: StudentSummaryRow[];
}

/** Extracts 'YYYY-MM-DD' from an ISO date string in Tashkent timezone (UTC+5). */
export function extractLocalDate(isoString: string): CalendarDate {
  const time = Date.parse(isoString);
  if (Number.isNaN(time)) return isoString.slice(0, 10);
  const SCHOOL_UTC_OFFSET_MS = 5 * 60 * 60 * 1000;
  return new Date(time + SCHOOL_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

/** Filters results by date range relative to today (Tashkent date 'YYYY-MM-DD'). */
export function filterResultsByRange(
  results: readonly PracticeResult[],
  range: TimeRange,
  today: CalendarDate,
): PracticeResult[] {
  if (range === 'all') return [...results];

  const daysBack = range === 'week' ? 7 : 30;
  const todayTime = Date.parse(`${today}T00:00:00Z`);
  const DAY_MS = 24 * 60 * 60 * 1000;
  const cutoffTime = todayTime - (daysBack - 1) * DAY_MS;

  return results.filter((result) => {
    const localDate = extractLocalDate(result.completedAt);
    const itemTime = Date.parse(`${localDate}T00:00:00Z`);
    return itemTime >= cutoffTime && itemTime <= todayTime + DAY_MS;
  });
}

/** Computes detailed statistics for a set of results (e.g. for a single student). */
export function computeStudentStats(results: readonly PracticeResult[]): StudentStats {
  let totalCorrect = 0;
  let totalProblems = 0;
  let totalSeconds = 0;

  const sectionMap: Record<SectionId, { sessions: number; correct: number; total: number }> = {
    formulasiz: { sessions: 0, correct: 0, total: 0 },
    kichik: { sessions: 0, correct: 0, total: 0 },
    katta: { sessions: 0, correct: 0, total: 0 },
    miks: { sessions: 0, correct: 0, total: 0 },
  };

  const dayMap = new Map<CalendarDate, { sessions: number; correct: number; total: number }>();

  for (const r of results) {
    totalCorrect += r.correct;
    totalProblems += r.total;
    totalSeconds += r.config.secondsPerNumber;

    const sec = sectionMap[r.config.section] ?? sectionMap.formulasiz;
    sec.sessions += 1;
    sec.correct += r.correct;
    sec.total += r.total;

    const date = extractLocalDate(r.completedAt);
    const day = dayMap.get(date) ?? { sessions: 0, correct: 0, total: 0 };
    day.sessions += 1;
    day.correct += r.correct;
    day.total += r.total;
    dayMap.set(date, day);
  }

  const bySection = Object.fromEntries(
    SECTION_IDS.map((id) => {
      const data = sectionMap[id];
      return [
        id,
        {
          section: id,
          sessions: data.sessions,
          correct: data.correct,
          total: data.total,
          accuracy: accuracyPercent(data.correct, data.total),
        },
      ];
    }),
  ) as Record<SectionId, SectionStats>;

  const dailyActivity: DailyActivity[] = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      sessions: data.sessions,
      correct: data.correct,
      total: data.total,
      accuracy: accuracyPercent(data.correct, data.total),
    }));

  return {
    totalSessions: results.length,
    totalCorrect,
    totalProblems,
    accuracy: accuracyPercent(totalCorrect, totalProblems),
    averageSecondsPerNumber:
      results.length > 0 ? Math.round((totalSeconds / results.length) * 10) / 10 : 0,
    bySection,
    dailyActivity,
  };
}

/** Computes classroom-wide statistics and per-student summaries. */
export function computeClassroomStats(
  students: readonly Student[],
  results: readonly PracticeResult[],
  range: TimeRange,
  today: CalendarDate,
): ClassroomStats {
  const filtered = filterResultsByRange(results, range, today);

  const resultsByStudent = new Map<string, PracticeResult[]>();
  for (const s of students) {
    resultsByStudent.set(s.id, []);
  }
  for (const r of filtered) {
    const list = resultsByStudent.get(r.studentId);
    if (list) list.push(r);
  }

  const studentRows: StudentSummaryRow[] = students
    .map((student) => ({
      student,
      stats: computeStudentStats(resultsByStudent.get(student.id) ?? []),
    }))
    .sort((a, b) => {
      if ((a.stats.totalSessions === 0) !== (b.stats.totalSessions === 0)) {
        return a.stats.totalSessions === 0 ? 1 : -1;
      }
      return (
        b.stats.accuracy - a.stats.accuracy ||
        b.stats.totalSessions - a.stats.totalSessions ||
        a.student.firstName.localeCompare(b.student.firstName)
      );
    });

  let totalCorrect = 0;
  let totalProblems = 0;
  let activeStudentsCount = 0;

  for (const row of studentRows) {
    if (row.stats.totalSessions > 0) activeStudentsCount += 1;
    totalCorrect += row.stats.totalCorrect;
    totalProblems += row.stats.totalProblems;
  }

  return {
    activeStudentsCount,
    totalSessions: filtered.length,
    totalCorrect,
    totalProblems,
    accuracy: accuracyPercent(totalCorrect, totalProblems),
    students: studentRows,
  };
}
