import { describe, expect, it } from 'vitest';
import { addToColumn, classifyMove, subtractFromColumn } from './soroban';

describe('classifyMove', () => {
  it.each([
    [1, 3, 'formulasiz'],
    [2, 5, 'formulasiz'],
    [7, -6, 'formulasiz'],
    [3, -3, 'formulasiz'],
    [4, 1, 'kichik'],
    [3, 4, 'kichik'],
    [5, -1, 'kichik'],
    [6, -4, 'kichik'],
    [6, 7, 'katta'],
    [13, -4, 'katta'],
    [21, -3, 'katta'],
    // The 10-complement itself needs −5+1 here, but the carry lands directly: still "katta".
    [5, 6, 'katta'],
    [45, 7, 'miks'], // tens 4 + 1 needs the 5-complement
    [52, -4, 'miks'], // tens 5 − 1 needs the 5-complement
    [95, 8, 'miks'], // carry cascades 9 → 0 into the hundreds
    [103, -5, 'miks'], // borrow cascades 0 → 9 from the hundreds
  ] as const)('%i %i → %s', (total, value, section) => {
    expect(classifyMove(total, value)).toBe(section);
  });

  it('rejects moves outside the rules', () => {
    expect(() => classifyMove(3, -4)).toThrow(RangeError);
    expect(() => classifyMove(3, 0)).toThrow(RangeError);
    expect(() => classifyMove(3, 1.5)).toThrow(RangeError);
    expect(() => classifyMove(-1, 2)).toThrow(RangeError);
  });

  it('classifies multi-digit moves correctly', () => {
    expect(classifyMove(10, 23)).toBe('formulasiz');
    expect(classifyMove(14, 23)).toBe('kichik');
    expect(classifyMove(18, 15)).toBe('katta');
    expect(classifyMove(48, 16)).toBe('miks');
    expect(classifyMove(78, -25)).toBe('formulasiz');
    expect(classifyMove(67, -24)).toBe('kichik');
    expect(classifyMove(42, -18)).toBe('katta');
    expect(classifyMove(52, -14)).toBe('miks');
  });
});

/*
 * Column rules transcribed from the reference artifact (ChaqqonChaqqon.jsx),
 * so the bead-based implementation is proven equivalent for every case.
 */
function referenceAdd(x: number, operand: number): string {
  const u = x >= 5 ? 1 : 0;
  const l = x - 5 * u;
  const du = operand >= 5 && u === 0 ? 1 : 0;
  const dl = operand - 5 * du;
  const y = x + operand;
  if (y <= 9 && u + du <= 1 && l + dl <= 4) return 'direct';
  if (y <= 9) return u === 0 && operand >= 1 && operand <= 4 && l + operand >= 5 ? 'smallFriend' : 'direct';
  return 'bigFriend';
}

function referenceSubtract(x: number, operand: number): string {
  const u = x >= 5 ? 1 : 0;
  const l = x - 5 * u;
  const du = operand >= 5 && u === 1 ? 1 : 0;
  const dl = operand - 5 * du;
  const y = x - operand;
  if (y >= 0 && du <= u && l >= dl) return 'direct';
  if (y >= 0) return u === 1 && operand >= 1 && operand <= 4 && operand >= l + 1 ? 'smallFriend' : 'direct';
  return 'bigFriend';
}

describe('column steps', () => {
  it('match the reference rules for every digit and amount', () => {
    for (let digit = 0; digit <= 9; digit++) {
      for (let amount = 1; amount <= 9; amount++) {
        const added = addToColumn(digit, amount);
        expect(added.technique).toBe(referenceAdd(digit, amount));
        expect(added.digit).toBe((digit + amount) % 10);
        expect(added.overflow).toBe(digit + amount >= 10);

        const subtracted = subtractFromColumn(digit, amount);
        expect(subtracted.technique).toBe(referenceSubtract(digit, amount));
        expect(subtracted.digit).toBe((digit - amount + 10) % 10);
        expect(subtracted.overflow).toBe(digit < amount);
      }
    }
  });
});
