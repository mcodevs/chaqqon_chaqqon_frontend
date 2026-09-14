import { describe, expect, it } from 'vitest';
import { formatSeconds } from './format';

describe('formatSeconds', () => {
  it('writes tenths with a decimal comma and whole seconds without one', () => {
    expect([0.3, 2.5, 6.9, 6, 7].map(formatSeconds)).toEqual(['0,3', '2,5', '6,9', '6', '7']);
  });

  it('never prints floating-point noise', () => {
    expect(formatSeconds(0.1 + 0.2)).toBe('0,3');
  });
});
