import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RODS,
  EARTH_BEADS,
  beadsOf,
  columnName,
  digitAt,
  digitOf,
  maxValue,
  moveExpression,
  planMove,
  toDigits,
  toValue,
  toggleEarth,
  toggleHeaven,
  withDigit,
} from './abacus';
import { classifyMove } from './soroban';

describe('rod beads', () => {
  it('splits every digit into a 5-bead and 1-beads', () => {
    for (let digit = 0; digit <= 9; digit++) {
      const beads = beadsOf(digit);
      expect(beads.heaven).toBe(digit >= 5);
      expect(beads.earth).toBe(digit % 5);
      expect(beads.earth).toBeLessThanOrEqual(EARTH_BEADS);
      expect(digitOf(beads)).toBe(digit);
    }
  });

  it('rejects anything that is not a digit', () => {
    expect(() => beadsOf(10)).toThrow(RangeError);
    expect(() => beadsOf(-1)).toThrow(RangeError);
    expect(() => beadsOf(1.5)).toThrow(RangeError);
  });
});

describe('clicking a bead', () => {
  it('pulls the 5-bead to the bar and pushes it back', () => {
    expect(toggleHeaven(0)).toBe(5);
    expect(toggleHeaven(3)).toBe(8);
    expect(toggleHeaven(7)).toBe(2);
  });

  it('brings up every bead above the one clicked', () => {
    expect(toggleEarth(0, 0)).toBe(1);
    expect(toggleEarth(0, 2)).toBe(3);
    expect(toggleEarth(0, 3)).toBe(4);
    expect(toggleEarth(5, 1)).toBe(7); // the 5-bead stays down
  });

  it('sends a counted bead back down together with the ones below it', () => {
    expect(toggleEarth(4, 3)).toBe(3);
    expect(toggleEarth(4, 0)).toBe(0);
    expect(toggleEarth(9, 1)).toBe(6);
  });

  it('rejects a bead that is not on the rod', () => {
    expect(() => toggleEarth(0, 4)).toThrow(RangeError);
    expect(() => toggleEarth(0, -1)).toThrow(RangeError);
  });
});

describe('board values', () => {
  it('reads rods from the ones up', () => {
    expect(toDigits(407, 4)).toEqual([7, 0, 4, 0]);
    expect(toValue([7, 0, 4, 0])).toBe(407);
    expect(digitAt(407, 2)).toBe(4);
    expect(withDigit(407, 1, 9)).toBe(497);
    expect(withDigit(407, 0, 0)).toBe(400);
    expect(maxValue(DEFAULT_RODS)).toBe(99_999);
  });

  it('names the place values', () => {
    expect(columnName(0)).toBe('Birlar');
    expect(columnName(1)).toBe("O'nlar");
    expect(moveExpression(7, 6)).toBe('7 + 6 = 13');
    expect(moveExpression(13, -4)).toBe('13 − 4 = 9');
  });
});

describe('planMove', () => {
  it('moves beads straight when the rod has room', () => {
    const steps = planMove(1, 3);
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({ column: 0, amount: 3, kind: 'direct', formula: '', value: 4 });
    expect(steps[0].text).toBe("Birlar xonasiga 3 ni qo'shing");
  });

  it('goes through the 5-bead for a small friend', () => {
    const [step] = planMove(4, 1);
    expect(step).toMatchObject({ column: 0, amount: 1, kind: 'small5', value: 5 });
    expect(step.formula).toBe('+1 = +5 − 4');
    expect(step.text).toContain("Kichik do'st");
  });

  it('splits a big friend into the complement and the carry', () => {
    const steps = planMove(7, 6);
    expect(steps).toHaveLength(2);
    expect(steps[0]).toMatchObject({ column: 0, amount: -4, kind: 'small5', carry: false, value: 3 });
    expect(steps[0].formula).toBe('+6 = +10 − 4');
    expect(steps[1]).toMatchObject({ column: 1, amount: 1, kind: 'direct', carry: true, value: 13 });
    expect(steps[1].text).toContain("O'tkazma");
  });

  it('borrows the same way when subtracting', () => {
    const steps = planMove(13, -7);
    expect(steps).toHaveLength(2);
    expect(steps[0]).toMatchObject({ column: 0, amount: 3, value: 16 });
    expect(steps[0].formula).toBe('−7 = −10 + 3');
    expect(steps[1]).toMatchObject({ column: 1, amount: -1, carry: true, value: 6 });
    expect(steps[1].text).toContain('Qarz');
  });

  it('keeps carrying while the rods stay full', () => {
    const steps = planMove(95, 8);
    expect(steps.map((step) => ({ column: step.column, amount: step.amount }))).toEqual([
      { column: 0, amount: -2 },
      { column: 1, amount: -9 },
      { column: 2, amount: 1 },
    ]);
    expect(steps.at(-1)?.value).toBe(103);
  });

  it('works rod by rod for multi-digit moves', () => {
    expect(planMove(0, 407).map((step) => step.column)).toEqual([0, 2]);
    expect(planMove(0, 407).at(-1)?.value).toBe(407);
  });

  it('never leaves the abacus', () => {
    expect(() => planMove(3, -4)).toThrow(RangeError);
    expect(() => planMove(0, 0)).toThrow(RangeError);
    expect(() => planMove(0, 1.5)).toThrow(RangeError);
    expect(() => planMove(-1, 1)).toThrow(RangeError);
    expect(() => planMove(999, 1, 3)).toThrow(RangeError);
    expect(() => planMove(1000, 1, 3)).toThrow(RangeError);
  });

  it('lands on the answer for every move a drill can produce', () => {
    for (let total = 0; total <= 199; total++) {
      for (let value = -99; value <= 99; value++) {
        if (value === 0 || total + value < 0) continue;

        const steps = planMove(total, value);
        expect(steps.length).toBeGreaterThan(0);

        let board = total;
        for (const step of steps) {
          // Exactly one rod moves per step, and it never spills out of 0…9.
          const before = digitAt(board, step.column);
          const after = before + step.amount;
          expect(after).toBeGreaterThanOrEqual(0);
          expect(after).toBeLessThanOrEqual(9);
          expect(step.kind === 'small5' || step.kind === 'direct').toBe(true);
          expect(step.text.length).toBeGreaterThan(0);

          board = withDigit(board, step.column, after);
          expect(board).toBe(step.value);
        }

        expect(board).toBe(total + value);
      }
    }
  });

  it('needs no formula exactly when the section says so', () => {
    for (let total = 0; total <= 99; total++) {
      for (let value = -9; value <= 9; value++) {
        if (value === 0 || total + value < 0) continue;

        const steps = planMove(total, value);
        const direct = steps.every((step) => step.kind === 'direct') && steps.length === 1;
        expect(direct).toBe(classifyMove(total, value) === 'formulasiz');
      }
    }
  });
});
