import { describe, expect, it } from 'vitest';
import { formatCalendarDate, formatLastActive, formatSeconds } from './format';

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
  it('returns Hali kirmagan when null or undefined', () => {
    expect(formatLastActive(null)).toEqual({ text: 'Hali kirmagan', isOnline: false });
    expect(formatLastActive(undefined)).toEqual({ text: 'Hali kirmagan', isOnline: false });
  });

  it('marks as Hozir onlayn when under 5 minutes', () => {
    const now = new Date().toISOString();
    expect(formatLastActive(now)).toEqual({ text: 'Hozir onlayn', isOnline: true });
  });
});
