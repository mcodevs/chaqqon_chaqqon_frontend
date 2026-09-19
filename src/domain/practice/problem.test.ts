import { describe, expect, it } from 'vitest';
import { createSeededRandom } from '../random';
import { SECTION_IDS, type SectionId } from './config';
import { generateProblem } from './problem';
import { classifyMove } from './soroban';

const ROW_COUNTS = [3, 4, 6, 10];
const PROBLEMS_PER_CASE = 200;

describe('generateProblem', () => {
  SECTION_IDS.forEach((section, sectionIndex) => {
    for (const rowCount of ROW_COUNTS) {
      it(`follows the "${section}" rules with ${rowCount} rows`, () => {
        const random = createSeededRandom(sectionIndex * 100 + rowCount);

        for (let i = 0; i < PROBLEMS_PER_CASE; i++) {
          const { numbers, answer } = generateProblem({ section, rowCount }, random);
          expect(numbers).toHaveLength(rowCount);

          const [opening, ...moves] = numbers;
          let total = opening;
          const categories = moves.map((value) => {
            expect(Math.abs(value)).toBeGreaterThanOrEqual(1);
            expect(Math.abs(value)).toBeLessThanOrEqual(9);
            const category = classifyMove(total, value);
            total += value;
            expect(total).toBeGreaterThanOrEqual(0);
            return category;
          });

          expect(answer).toBe(total);
          assertSectionRules(section, opening, categories);
        }
      });
    }
  });

  it('is deterministic for the same seed', () => {
    const shape = { section: 'miks' as const, rowCount: 6 };
    expect(generateProblem(shape, createSeededRandom(42))).toEqual(
      generateProblem(shape, createSeededRandom(42)),
    );
  });

  it('generates multi-digit problems (2 and 3 digits)', () => {
    for (const digitCount of [2, 3]) {
      const min = Math.pow(10, digitCount - 1);
      const max = Math.pow(10, digitCount) - 1;
      for (const section of SECTION_IDS) {
        const random = createSeededRandom(digitCount * 100);
        const { numbers, answer } = generateProblem({ section, rowCount: 4, digitCount }, random);
        expect(numbers).toHaveLength(4);
        expect(numbers[0]).toBeGreaterThanOrEqual(min);
        expect(numbers[0]).toBeLessThanOrEqual(max);
        let total = numbers[0];
        for (let i = 1; i < numbers.length; i++) {
          expect(Math.abs(numbers[i])).toBeGreaterThanOrEqual(min);
          expect(Math.abs(numbers[i])).toBeLessThanOrEqual(max);
          total += numbers[i];
          expect(total).toBeGreaterThanOrEqual(0);
        }
        expect(answer).toBe(total);
      }
    }
  });
});

function assertSectionRules(section: SectionId, opening: number, categories: SectionId[]) {
  const hits = categories.filter((category) => category === section).length;

  switch (section) {
    case 'formulasiz':
      expect(opening).toBeGreaterThanOrEqual(1);
      expect(opening).toBeLessThanOrEqual(9);
      expect(hits).toBe(categories.length);
      break;
    case 'kichik':
      expect(opening).toBeGreaterThanOrEqual(1);
      expect(opening).toBeLessThanOrEqual(8);
      expect(hits).toBe(categories.length);
      break;
    case 'katta':
      expect(opening).toBeLessThanOrEqual(9);
      expect(hits).toBeGreaterThanOrEqual(Math.ceil(categories.length * 0.6));
      break;
    case 'miks':
      expect(opening).toBeGreaterThanOrEqual(41);
      expect(opening).toBeLessThanOrEqual(99);
      expect(categories[0]).toBe('miks');
      break;
  }
}
