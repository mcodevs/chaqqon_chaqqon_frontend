import { describe, expect, it } from 'vitest';
import type { DailyActivity } from './statistics';
import { buildMonthGrid, computeStreak, daysSinceLastActive, shiftMonth, startOfMonth } from './streak';

function days(...dates: string[]): DailyActivity[] {
  return dates.map((date) => ({ date, sessions: 1, correct: 5, total: 5, accuracy: 100 }));
}

describe('computeStreak', () => {
  it('returns an empty streak without any activity', () => {
    expect(computeStreak([], '2026-09-23')).toEqual({
      current: 0,
      longest: 0,
      activeToday: false,
      lastActiveDate: null,
    });
  });

  it('counts a single day practised today', () => {
    const streak = computeStreak(days('2026-09-23'), '2026-09-23');
    expect(streak).toMatchObject({ current: 1, longest: 1, activeToday: true });
  });

  it('keeps the streak alive while today is still empty', () => {
    const streak = computeStreak(days('2026-09-21', '2026-09-22'), '2026-09-23');
    expect(streak).toMatchObject({ current: 2, activeToday: false, lastActiveDate: '2026-09-22' });
  });

  it('breaks the streak once yesterday is empty too', () => {
    const streak = computeStreak(days('2026-09-20', '2026-09-21'), '2026-09-23');
    expect(streak).toMatchObject({ current: 0, longest: 2, activeToday: false });
  });

  it('ignores days recorded with no session', () => {
    const activity: DailyActivity[] = [
      { date: '2026-09-22', sessions: 0, correct: 0, total: 0, accuracy: 0 },
      ...days('2026-09-23'),
    ];
    expect(computeStreak(activity, '2026-09-23')).toMatchObject({ current: 1, longest: 1 });
  });

  it('counts a run that crosses a month boundary', () => {
    const streak = computeStreak(days('2026-08-30', '2026-08-31', '2026-09-01'), '2026-09-01');
    expect(streak).toMatchObject({ current: 3, longest: 3 });
  });

  it('remembers a longer past run than the current one', () => {
    const streak = computeStreak(
      days('2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-22', '2026-09-23'),
      '2026-09-23',
    );
    expect(streak).toMatchObject({ current: 2, longest: 4 });
  });

  it('accepts unsorted activity', () => {
    const streak = computeStreak(days('2026-09-23', '2026-09-21', '2026-09-22'), '2026-09-23');
    expect(streak).toMatchObject({ current: 3, longest: 3 });
  });
});

describe('daysSinceLastActive', () => {
  it('is null without any activity', () => {
    expect(daysSinceLastActive(computeStreak([], '2026-09-23'), '2026-09-23')).toBeNull();
  });

  it('is zero when the student practised today', () => {
    expect(daysSinceLastActive(computeStreak(days('2026-09-23'), '2026-09-23'), '2026-09-23')).toBe(0);
  });

  it('counts the gap across a month boundary', () => {
    expect(daysSinceLastActive(computeStreak(days('2026-08-31'), '2026-09-02'), '2026-09-02')).toBe(2);
  });
});

describe('month helpers', () => {
  it('finds the first day of the month', () => {
    expect(startOfMonth('2026-09-23')).toBe('2026-09-01');
  });

  it('shifts across a year boundary', () => {
    expect(shiftMonth('2026-01-01', -1)).toBe('2025-12-01');
    expect(shiftMonth('2026-12-01', 1)).toBe('2027-01-01');
  });
});

describe('buildMonthGrid', () => {
  it('builds whole Monday-first weeks covering the month', () => {
    const weeks = buildMonthGrid([], '2026-09-15');
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    // 2026-09-01 is a Tuesday, so the grid opens on Monday 2026-08-31.
    expect(weeks[0][0].date).toBe('2026-08-31');
    expect(weeks[0][0].inMonth).toBe(false);
    expect(weeks[0][1]).toMatchObject({ date: '2026-09-01', inMonth: true });

    const inMonth = weeks.flat().filter((day) => day.inMonth);
    expect(inMonth).toHaveLength(30);
    expect(inMonth[29].date).toBe('2026-09-30');
  });

  it('starts flush when the month begins on a Monday', () => {
    const weeks = buildMonthGrid([], '2026-06-10'); // 2026-06-01 is a Monday
    expect(weeks[0][0]).toMatchObject({ date: '2026-06-01', inMonth: true });
  });

  it('fills in session counts and leaves other days at zero', () => {
    const weeks = buildMonthGrid(days('2026-09-23'), '2026-09-01');
    const cells = weeks.flat();
    expect(cells.find((day) => day.date === '2026-09-23')?.sessions).toBe(1);
    expect(cells.find((day) => day.date === '2026-09-24')?.sessions).toBe(0);
  });

  it('handles February in a leap year', () => {
    const weeks = buildMonthGrid([], '2028-02-10');
    expect(weeks.flat().filter((day) => day.inMonth)).toHaveLength(29);
  });
});
