import { describe, expect, it } from 'vitest';
import type { PracticeConfig } from './practice/config';
import type { PracticeResult } from './results';
import {
  computeClassroomStats,
  computeStudentStats,
  extractLocalDate,
  filterResultsByRange,
} from './statistics';
import type { Student } from './users';

const dummyConfig: PracticeConfig = {
  section: 'formulasiz',
  rowCount: 4,
  secondsPerNumber: 4,
  problemCount: 5,
  digitCount: 1,
};

const createResult = (
  id: string,
  studentId: string,
  date: string,
  correct: number,
  total: number,
  section: PracticeConfig['section'] = 'formulasiz',
): PracticeResult => ({
  id,
  studentId,
  completedAt: `${date}T10:00:00.000Z`,
  config: { ...dummyConfig, section },
  correct,
  total,
  mode: 'practice',
  roomId: null,
});

describe('statistics', () => {
  it('extracts local date in Tashkent timezone', () => {
    // 2026-09-15 20:00 UTC is 2026-09-16 01:00 UTC+5 in Tashkent
    expect(extractLocalDate('2026-09-15T20:00:00.000Z')).toBe('2026-09-16');
  });

  it('filters results by 7 days and 30 days', () => {
    const today = '2026-09-16';
    const results = [
      createResult('1', 's1', '2026-09-16', 5, 5), // today
      createResult('2', 's1', '2026-09-10', 4, 5), // 6 days ago (in 7 days)
      createResult('3', 's1', '2026-09-08', 3, 5), // 8 days ago (out of 7 days, in 30 days)
      createResult('4', 's1', '2026-08-01', 5, 5), // 46 days ago (out of 30 days)
    ];

    expect(filterResultsByRange(results, 'week', today)).toHaveLength(2);
    expect(filterResultsByRange(results, 'month', today)).toHaveLength(3);
    expect(filterResultsByRange(results, 'all', today)).toHaveLength(4);
  });

  it('computes student stats accurately', () => {
    const results = [
      createResult('1', 's1', '2026-09-16', 4, 5, 'formulasiz'),
      createResult('2', 's1', '2026-09-16', 5, 5, 'kichik'),
      createResult('3', 's1', '2026-09-15', 2, 5, 'katta'),
    ];

    const stats = computeStudentStats(results);
    expect(stats.totalSessions).toBe(3);
    expect(stats.totalCorrect).toBe(11);
    expect(stats.totalProblems).toBe(15);
    expect(stats.accuracy).toBe(73); // 11/15 = 73.33% -> 73%
    expect(stats.averageSecondsPerNumber).toBe(4);

    expect(stats.bySection.formulasiz.accuracy).toBe(80);
    expect(stats.bySection.kichik.accuracy).toBe(100);
    expect(stats.bySection.katta.accuracy).toBe(40);
    expect(stats.bySection.miks.sessions).toBe(0);

    expect(stats.dailyActivity).toHaveLength(2);
  });

  it('computes classroom stats', () => {
    const students: Student[] = [
      { id: 's1', firstName: 'Ali', lastName: 'Valiyev', age: null },
      { id: 's2', firstName: 'Vali', lastName: 'Aliyev', age: null },
    ];
    const results = [
      createResult('1', 's1', '2026-09-16', 5, 5),
      createResult('2', 's1', '2026-09-15', 5, 5),
    ];

    const classroom = computeClassroomStats(students, results, 'week', '2026-09-16');
    expect(classroom.activeStudentsCount).toBe(1);
    expect(classroom.totalSessions).toBe(2);
    expect(classroom.totalCorrect).toBe(10);
    expect(classroom.students[0].student.id).toBe('s1');
    expect(classroom.students[1].stats.totalSessions).toBe(0);
  });
});
