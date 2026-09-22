import { type CalendarDate, addDays } from './billing';
import type { DailyActivity } from './statistics';

/**
 * Practice streaks: how many days in a row the student practised. A day counts when it holds at
 * least one session, in any mode. Days are Tashkent days, as everywhere else in the app.
 */

export interface StreakInfo {
  /** Days in a row up to today; today itself may still be empty, see `activeToday`. */
  current: number;
  /** The longest run the student ever had, including the current one. */
  longest: number;
  activeToday: boolean;
  lastActiveDate: CalendarDate | null;
}

export interface MonthDay {
  date: CalendarDate;
  sessions: number;
  /** False for the leading and trailing days that only fill the week rows. */
  inMonth: boolean;
}

const EMPTY_STREAK: StreakInfo = { current: 0, longest: 0, activeToday: false, lastActiveDate: null };

function activeDates(dailyActivity: readonly DailyActivity[]): Set<CalendarDate> {
  const dates = new Set<CalendarDate>();
  for (const day of dailyActivity) {
    if (day.sessions > 0) dates.add(day.date);
  }
  return dates;
}

/**
 * A streak survives an empty today: it only breaks once yesterday is empty too, so opening the app
 * in the morning does not show a zero for a run that is still alive.
 */
export function computeStreak(dailyActivity: readonly DailyActivity[], today: CalendarDate): StreakInfo {
  const active = activeDates(dailyActivity);
  if (active.size === 0) return EMPTY_STREAK;

  const sorted = [...active].sort();
  const lastActiveDate = sorted[sorted.length - 1];

  let longest = 0;
  let run = 0;
  let previous: CalendarDate | null = null;
  for (const date of sorted) {
    run = previous !== null && addDays(previous, 1) === date ? run + 1 : 1;
    if (run > longest) longest = run;
    previous = date;
  }

  const activeToday = active.has(today);
  const yesterday = addDays(today, -1);
  let cursor = activeToday ? today : active.has(yesterday) ? yesterday : null;

  let current = 0;
  while (cursor !== null && active.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return { current, longest, activeToday, lastActiveDate };
}

/** Days since the last session, or null when the student never practised. */
export function daysSinceLastActive(streak: StreakInfo, today: CalendarDate): number | null {
  if (streak.lastActiveDate === null) return null;
  let days = 0;
  let cursor = streak.lastActiveDate;
  while (cursor < today) {
    cursor = addDays(cursor, 1);
    days += 1;
  }
  return days;
}

/** The first day of the month `date` falls in. */
export function startOfMonth(date: CalendarDate): CalendarDate {
  return `${date.slice(0, 7)}-01`;
}

export function shiftMonth(date: CalendarDate, months: number): CalendarDate {
  const [year, month] = date.split('-').map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  return target.toISOString().slice(0, 10);
}

/** Monday-first weeks covering the whole month, so the grid always has seven columns. */
export function buildMonthGrid(dailyActivity: readonly DailyActivity[], month: CalendarDate): MonthDay[][] {
  const sessionsByDate = new Map<CalendarDate, number>();
  for (const day of dailyActivity) {
    sessionsByDate.set(day.date, (sessionsByDate.get(day.date) ?? 0) + day.sessions);
  }

  const first = startOfMonth(month);
  const monthPrefix = first.slice(0, 7);
  const nextMonth = shiftMonth(first, 1);

  // getUTCDay(): 0 is Sunday, and the grid starts on Monday.
  const weekday = new Date(`${first}T00:00:00Z`).getUTCDay();
  const gridStart = addDays(first, -((weekday + 6) % 7));

  const weeks: MonthDay[][] = [];
  let cursor = gridStart;
  do {
    const week: MonthDay[] = [];
    for (let i = 0; i < 7; i += 1) {
      week.push({
        date: cursor,
        sessions: sessionsByDate.get(cursor) ?? 0,
        inMonth: cursor.startsWith(monthPrefix),
      });
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  } while (cursor < nextMonth);
  return weeks;
}
