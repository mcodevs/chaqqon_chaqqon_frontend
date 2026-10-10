import { describe, expect, it } from 'vitest';
import { countUpValue, easeOutCubic } from './useCountUp';

describe('count-up easing', () => {
  it('starts at 0, ends at 1 and never leaves that range', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(-0.5)).toBe(0);
    expect(easeOutCubic(2)).toBe(1);
  });

  it('runs ahead early and slows down at the end', () => {
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875);
    expect(easeOutCubic(0.25) - easeOutCubic(0)).toBeGreaterThan(easeOutCubic(1) - easeOutCubic(0.75));
  });
});

describe('count-up value', () => {
  it('shows whole numbers and lands exactly on the target', () => {
    expect(countUpValue(0, 1234, 0)).toBe(0);
    expect(Number.isInteger(countUpValue(0, 1234, 0.37))).toBe(true);
    expect(countUpValue(0, 1234, 1)).toBe(1234);
    expect(countUpValue(0, 1234, 1.4)).toBe(1234);
  });

  it('only ever climbs towards the target', () => {
    let previous = 0;
    for (let step = 0; step <= 20; step++) {
      const value = countUpValue(0, 5000, step / 20);
      expect(value).toBeGreaterThanOrEqual(previous);
      expect(value).toBeLessThanOrEqual(5000);
      previous = value;
    }
  });

  it('counts on from a number already on screen', () => {
    expect(countUpValue(1000, 1500, 0)).toBe(1000);
    expect(countUpValue(1000, 1500, 1)).toBe(1500);
  });
});
