import { describe, expect, it } from 'vitest';
import { formatCalendarDate, formatCount, formatLastActive, formatSeconds, formatSom } from './format';

describe('formatSeconds', () => {
  it('writes tenths with a decimal comma and whole seconds without one', () => {
    expect([0.3, 2.5, 6.9, 6, 7].map(formatSeconds)).toEqual(['0,3', '2,5', '6,9', '6', '7']);
  });

  it('never prints floating-point noise', () => {
    expect(formatSeconds(0.1 + 0.2)).toBe('0,3');
  });
});

describe('formatCalendarDate', () => {
  it('writes billing days as day.month.year', () => {
    expect(formatCalendarDate('2026-10-04')).toBe('04.10.2026');
  });
});

describe('formatLastActive', () => {
  // Midday in Tashkent, so "today" and "yesterday" are unambiguous however late the suite runs.
  const NOW = new Date('2026-10-06T07:00:00.000Z');
  const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
  const MINUTE = 60 * 1000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  it('returns Hali kirmagan when null or undefined', () => {
    expect(formatLastActive(null, NOW)).toEqual({ text: 'Hali kirmagan', isOnline: false });
    expect(formatLastActive(undefined, NOW)).toEqual({ text: 'Hali kirmagan', isOnline: false });
    expect(formatLastActive('', NOW)).toEqual({ text: 'Hali kirmagan', isOnline: false });
    expect(formatLastActive('invalid-date', NOW)).toEqual({
      text: 'Hali kirmagan',
      isOnline: false,
    });
  });

  it('marks as Hozir onlayn when under 5 minutes', () => {
    expect(formatLastActive(ago(0), NOW)).toEqual({ text: 'Hozir onlayn', isOnline: true });
    expect(formatLastActive(ago(2 * MINUTE), NOW)).toEqual({
      text: 'Hozir onlayn',
      isOnline: true,
    });
  });

  it('handles minor clock skew into the future gracefully', () => {
    expect(formatLastActive(ago(-30 * 1000), NOW)).toEqual({
      text: 'Hozir onlayn',
      isOnline: true,
    });
  });

  it('formats as Bugun, HH:MM when earlier today but more than 5 minutes ago', () => {
    expect(formatLastActive(ago(20 * MINUTE), NOW)).toEqual({
      text: 'Bugun, 11:40',
      isOnline: false,
    });
  });

  it('formats as Kecha, HH:MM when yesterday', () => {
    expect(formatLastActive(ago(25 * HOUR), NOW)).toEqual({
      text: 'Kecha, 11:00',
      isOnline: false,
    });
  });

  it('formats as X kun oldin when several days ago', () => {
    expect(formatLastActive(ago(3 * DAY), NOW)).toEqual({ text: '3 kun oldin', isOnline: false });
  });

  it('reads the real clock when no reference time is given', () => {
    expect(formatLastActive(new Date().toISOString())).toEqual({
      text: 'Hozir onlayn',
      isOnline: true,
    });
  });
});

describe('formatCount', () => {
  it('spaces the thousands of a count', () => {
    expect(formatCount(7)).toBe('7');
    expect(formatCount(12_345)).toBe('12 345');
    expect(formatCount(1_234_567)).toBe('1 234 567');
  });
});

describe('formatSom', () => {
  it('groups thousands with spaces and writes a real minus', () => {
    expect(formatSom(150_000)).toBe("150 000 so'm");
    expect(formatSom(-1_500_000)).toBe("−1 500 000 so'm");
    expect(formatSom(0)).toBe("0 so'm");
    expect(formatSom(999)).toBe("999 so'm");
  });
});
