import { describe, expect, it } from 'vitest';
import { DEFAULT_PRACTICE_CONFIG, DEFAULT_SOROBAN_CONFIG, normalizePracticeConfig } from './config';

describe('normalizePracticeConfig', () => {
  it('keeps a valid config as it is', () => {
    const config = {
      kind: 'anzan',
      section: 'katta',
      rowCount: 7,
      secondsPerNumber: 0.8,
      problemCount: 8,
      digitCount: 2,
    };
    expect(normalizePracticeConfig(config)).toEqual(config);
  });

  it('clamps numbers into the allowed limits', () => {
    expect(
      normalizePracticeConfig({
        section: 'miks',
        rowCount: 50,
        secondsPerNumber: 0,
        problemCount: 6.6,
        digitCount: 5,
      }),
    ).toEqual({
      kind: 'anzan',
      section: 'miks',
      rowCount: 10,
      secondsPerNumber: 0.3,
      problemCount: 7,
      digitCount: 3,
    });
    // Saved before the limit was lowered from 17 seconds.
    expect(normalizePracticeConfig({ secondsPerNumber: 17 }).secondsPerNumber).toBe(7);
    expect(normalizePracticeConfig({ digitCount: 0 }).digitCount).toBe(1);
    expect(normalizePracticeConfig({ digitCount: 4 }).digitCount).toBe(3);
  });

  it('keeps every tenth of a second from 0.3 to 7 exact', () => {
    for (let tenths = 3; tenths <= 70; tenths++) {
      expect(normalizePracticeConfig({ secondsPerNumber: tenths / 10 }).secondsPerNumber).toBe(tenths / 10);
    }
    expect(normalizePracticeConfig({ secondsPerNumber: 0.1 + 0.2 }).secondsPerNumber).toBe(0.3);
    expect(normalizePracticeConfig({ secondsPerNumber: 2.46 }).secondsPerNumber).toBe(2.5);
  });

  it('reads a config saved before the soroban drill existed as an anzan one', () => {
    expect(normalizePracticeConfig({ section: 'katta', rowCount: 5 }).kind).toBe('anzan');
    expect(normalizePracticeConfig({ kind: 'nope' }).kind).toBe('anzan');
  });

  it('gives the soroban drill its own limits', () => {
    const config = normalizePracticeConfig({ kind: 'soroban', digitCount: 5, problemCount: 30 });
    expect(config).toMatchObject({ kind: 'soroban', digitCount: 5, problemCount: 30 });

    expect(normalizePracticeConfig({ kind: 'soroban', digitCount: 9 }).digitCount).toBe(5);
    expect(normalizePracticeConfig({ kind: 'soroban', problemCount: 99 }).problemCount).toBe(30);
    expect(normalizePracticeConfig({ kind: 'soroban' })).toEqual(DEFAULT_SOROBAN_CONFIG);
  });

  it('drops a topic and the wider limits when the drill switches back to anzan', () => {
    const wide = normalizePracticeConfig({ kind: 'soroban', digitCount: 5, problemCount: 30 });

    expect(normalizePracticeConfig({ ...wide, kind: 'anzan' })).toMatchObject({
      digitCount: 3,
      problemCount: 10,
    });
  });

  it('never keeps a topic on a soroban card', () => {
    expect(normalizePracticeConfig({ kind: 'soroban', topicId: 'kichik+4' }).topicId).toBeUndefined();
  });

  it('falls back to defaults for missing or unknown values', () => {
    expect(normalizePracticeConfig(null)).toEqual(DEFAULT_PRACTICE_CONFIG);
    expect(normalizePracticeConfig({ section: 'nope', rowCount: '5', digitCount: 'invalid' })).toEqual(
      DEFAULT_PRACTICE_CONFIG,
    );
  });
});
