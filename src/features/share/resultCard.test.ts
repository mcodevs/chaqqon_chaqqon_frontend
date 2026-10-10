import { describe, expect, it } from 'vitest';
import { DEFAULT_PRACTICE_CONFIG, DEFAULT_SOROBAN_CONFIG } from '@/domain/practice/config';
import { drillDetail, praiseFor, resultCardData, shareFileName, shareText } from './resultCard';

const input = {
  title: 'Interaktiv uy vazifasi',
  name: 'Ali Valiyev',
  detail: 'Chaqnovchi · 2 xonali · 1,5 s',
  correct: 9,
  total: 10,
  date: '2026-09-29',
};

describe('praiseFor', () => {
  it.each([
    [100, 'Mukammal!'],
    [95, "Zo'r natija!"],
    [90, "Zo'r natija!"],
    [80, 'Ajoyib!'],
    [60, 'Yaxshi!'],
    [50, 'Yaxshi!'],
    [40, 'Mashq davom etadi!'],
    [0, 'Mashq davom etadi!'],
  ])('reads %i%% as "%s"', (accuracy, praise) => {
    expect(praiseFor(accuracy).praise).toBe(praise);
  });

  it('always leaves the child something to show', () => {
    for (let accuracy = 0; accuracy <= 100; accuracy += 1) {
      const { praise, badge } = praiseFor(accuracy);
      expect(praise).not.toBe('');
      expect(badge).not.toBe('');
    }
  });
});

describe('drillDetail', () => {
  it('describes a soroban card by its width', () => {
    expect(drillDetail({ ...DEFAULT_SOROBAN_CONFIG, digitCount: 2, secondsPerNumber: 1.5 })).toBe(
      'Chaqnovchi · 2 xonali · 1,5 s',
    );
  });

  it('describes an anzan problem by its section and rows', () => {
    expect(
      drillDetail({ ...DEFAULT_PRACTICE_CONFIG, section: 'kichik', rowCount: 5, secondsPerNumber: 4 }),
    ).toBe("Kichik do'st · 5 qator · 4 s");
  });
});

describe('resultCardData', () => {
  it("carries the child's own teacher to the picture's footer", () => {
    expect(resultCardData(input).teacher).toBeNull();
    expect(resultCardData({ ...input, teacher: 'Dilnoza Karimova' }).teacher).toBe('Dilnoza Karimova');
  });

  it('works out the score and writes the day the way it is read', () => {
    expect(resultCardData(input)).toMatchObject({
      title: 'Interaktiv uy vazifasi',
      name: 'Ali Valiyev',
      correct: 9,
      total: 10,
      accuracy: 90,
      praise: "Zo'r natija!",
      date: '29.09.2026',
    });
  });
});

describe('shareText', () => {
  it('carries the name, the score and the brand', () => {
    const text = shareText(resultCardData(input));
    expect(text).toContain('Ali Valiyev');
    expect(text).toContain('9/10');
    expect(text).toContain('90%');
    expect(text).toContain('Chaqqon-chaqqon');
  });
});

describe('shareFileName', () => {
  it('names the file after the child and the day', () => {
    expect(shareFileName(resultCardData(input))).toBe('chaqqon-chaqqon-ali-valiyev-2026-09-29.png');
  });

  it('survives a name with no latin letters at all', () => {
    expect(shareFileName(resultCardData({ ...input, name: '🙂' }))).toBe(
      'chaqqon-chaqqon-natija-2026-09-29.png',
    );
  });

  it('keeps an apostrophe out of the file name', () => {
    expect(shareFileName(resultCardData({ ...input, name: "G'ulom O'ktamov" }))).toBe(
      'chaqqon-chaqqon-gulom-oktamov-2026-09-29.png',
    );
  });
});
