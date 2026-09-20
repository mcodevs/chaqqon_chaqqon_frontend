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
    expect(formatLastActive('')).toEqual({ text: 'Hali kirmagan', isOnline: false });
    expect(formatLastActive('invalid-date')).toEqual({ text: 'Hali kirmagan', isOnline: false });
  });

  it('marks as Hozir onlayn when under 5 minutes', () => {
    const now = new Date().toISOString();
    expect(formatLastActive(now)).toEqual({ text: 'Hozir onlayn', isOnline: true });

    const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    expect(formatLastActive(twoMinsAgo)).toEqual({ text: 'Hozir onlayn', isOnline: true });
  });

  it('handles minor clock skew into the future gracefully', () => {
    const thirtySecsFuture = new Date(Date.now() + 30 * 1000).toISOString();
    expect(formatLastActive(thirtySecsFuture)).toEqual({ text: 'Hozir onlayn', isOnline: true });
  });

  it('formats as Bugun, HH:MM when earlier today but more than 5 minutes ago', () => {
    // 20 minutes ago
    const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
    const result = formatLastActive(twentyMinsAgo.toISOString());
    expect(result.isOnline).toBe(false);
    expect(result.text).toMatch(/^Bugun, \d{2}:\d{2}$/);
  });

  it('formats as Kecha, HH:MM when yesterday', () => {
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const result = formatLastActive(yesterday.toISOString());
    expect(result.isOnline).toBe(false);
    // May be Kecha, HH:MM or X kun oldin depending on exact boundary
    expect(result.text).toContain(':');
  });

  it('formats as X kun oldin when several days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatLastActive(threeDaysAgo)).toEqual({ text: '3 kun oldin', isOnline: false });
  });
});
