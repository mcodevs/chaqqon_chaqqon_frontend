import type { SectionId } from './config';

/*
 * Soroban (abacus) model used to classify moves the way they are taught.
 * Every column holds digit = 5·upper + lower, with upper ∈ {0, 1} and lower ∈ 0…4.
 * A move adds or subtracts one digit (1…9) starting at the ones column; a carry
 * or borrow sends ±1 into the next column, which is classified the same way.
 */

type ColumnTechnique = 'direct' | 'smallFriend' | 'bigFriend';

export interface ColumnStep {
  technique: ColumnTechnique;
  digit: number;
  /** Carry (addition) or borrow (subtraction) into the next column. */
  overflow: boolean;
}

function toBeads(digit: number) {
  const upper = digit >= 5 ? 1 : 0;
  return { upper, lower: digit - 5 * upper };
}

export function addToColumn(digit: number, amount: number): ColumnStep {
  const sum = digit + amount;
  if (sum >= 10) return { technique: 'bigFriend', digit: sum - 10, overflow: true };

  const current = toBeads(digit);
  const change = toBeads(amount);
  const fits = current.upper + change.upper <= 1 && current.lower + change.lower <= 4;
  return { technique: fits ? 'direct' : 'smallFriend', digit: sum, overflow: false };
}

export function subtractFromColumn(digit: number, amount: number): ColumnStep {
  const difference = digit - amount;
  if (difference < 0) return { technique: 'bigFriend', digit: difference + 10, overflow: true };

  const current = toBeads(digit);
  const change = toBeads(amount);
  const fits = current.upper >= change.upper && current.lower >= change.lower;
  return { technique: fits ? 'direct' : 'smallFriend', digit: difference, overflow: false };
}

/**
 * Names the section that teaches adding `value` (positive or negative non-zero integer) to `total`:
 * - formulasiz — beads in all columns are enough (direct move);
 * - kichik     — no carries/borrows, needs 5-complement formula (+5-x or -5+x);
 * - katta      — needs 10-complement (carry/borrow) and lands directly on higher columns;
 * - miks       — a carry/borrow cascade needs a 5-complement or combination formula on a higher column.
 */
export function classifyMove(total: number, value: number): SectionId {
  const amount = Math.abs(value);
  if (!Number.isInteger(total) || total < 0) throw new RangeError(`Invalid total ${total}`);
  if (!Number.isInteger(value) || amount < 1)
    throw new RangeError(`Move must be non-zero integer, got ${value}`);
  if (total + value < 0) throw new RangeError(`Move ${value} would make total ${total} negative`);

  const isAdd = value > 0;
  let remainingTotal = total;
  let remainingVal = amount;
  let carryOrBorrow = 0;

  let hadCarryOrBorrow = false;
  let hadSmallFriend = false;
  let hadMiks = false;

  let colIndex = 0;
  while (remainingVal > 0 || carryOrBorrow > 0) {
    let rodDigit = remainingTotal % 10;
    const valDigit = remainingVal % 10;
    remainingTotal = Math.floor(remainingTotal / 10);
    remainingVal = Math.floor(remainingVal / 10);

    let nextCarryOrBorrow = 0;

    if (isAdd) {
      if (carryOrBorrow > 0) {
        hadCarryOrBorrow = true;
        const stepCarry = addToColumn(rodDigit, carryOrBorrow);
        rodDigit = stepCarry.digit;
        if (stepCarry.technique === 'smallFriend') {
          hadMiks = true;
        }
        if (stepCarry.overflow) {
          nextCarryOrBorrow += 1;
          if (colIndex > 0) hadMiks = true;
        }
      }

      if (valDigit > 0) {
        const stepVal = addToColumn(rodDigit, valDigit);
        rodDigit = stepVal.digit;
        if (stepVal.technique === 'smallFriend') {
          hadSmallFriend = true;
        } else if (stepVal.technique === 'bigFriend') {
          hadCarryOrBorrow = true;
        }
        if (stepVal.overflow) {
          nextCarryOrBorrow += 1;
        }
      }
    } else {
      if (carryOrBorrow > 0) {
        hadCarryOrBorrow = true;
        const stepBorrow = subtractFromColumn(rodDigit, carryOrBorrow);
        rodDigit = stepBorrow.digit;
        if (stepBorrow.technique === 'smallFriend') {
          hadMiks = true;
        }
        if (stepBorrow.overflow) {
          nextCarryOrBorrow += 1;
          if (colIndex > 0) hadMiks = true;
        }
      }

      if (valDigit > 0) {
        const stepVal = subtractFromColumn(rodDigit, valDigit);
        rodDigit = stepVal.digit;
        if (stepVal.technique === 'smallFriend') {
          hadSmallFriend = true;
        } else if (stepVal.technique === 'bigFriend') {
          hadCarryOrBorrow = true;
        }
        if (stepVal.overflow) {
          nextCarryOrBorrow += 1;
        }
      }
    }

    carryOrBorrow = nextCarryOrBorrow;
    colIndex++;
  }

  if (hadMiks) return 'miks';
  if (hadCarryOrBorrow) return 'katta';
  if (hadSmallFriend) return 'kichik';
  return 'formulasiz';
}
