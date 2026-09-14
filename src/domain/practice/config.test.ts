import { describe, expect, it } from 'vitest';
import { DEFAULT_PRACTICE_CONFIG, normalizePracticeConfig } from './config';

describe('normalizePracticeConfig', () => {
  it('keeps a valid config as it is', () => {
    const config = { section: 'katta', rowCount: 7, secondsPerNumber: 0.8, problemCount: 8 };
    expect(normalizePracticeConfig(config)).toEqual(config);
  });

  it('clamps numbers into the allowed limits', () => {
    expect(
      normalizePracticeConfig({ section: 'miks', rowCount: 50, secondsPerNumber: 0, problemCount: 6.6 }),
    ).toEqual({
      section: 'miks',
      rowCount: 10,
      secondsPerNumber: 0.3,
      problemCount: 7,
    });
    // Saved before the limit was lowered from 17 seconds.
    expect(normalizePracticeConfig({ secondsPerNumber: 17 }).secondsPerNumber).toBe(7);
  });

  it('keeps every tenth of a second from 0.3 to 7 exact', () => {
    for (let tenths = 3; tenths <= 70; tenths++) {
      expect(normalizePracticeConfig({ secondsPerNumber: tenths / 10 }).secondsPerNumber).toBe(tenths / 10);
    }
    expect(normalizePracticeConfig({ secondsPerNumber: 0.1 + 0.2 }).secondsPerNumber).toBe(0.3);
    expect(normalizePracticeConfig({ secondsPerNumber: 2.46 }).secondsPerNumber).toBe(2.5);
  });

  it('falls back to defaults for missing or unknown values', () => {
    expect(normalizePracticeConfig(null)).toEqual(DEFAULT_PRACTICE_CONFIG);
    expect(normalizePracticeConfig({ section: 'nope', rowCount: '5', digitCount: 2 })).toEqual(
      DEFAULT_PRACTICE_CONFIG,
    );
  });
});
