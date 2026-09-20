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

/*
 * Per-column technique naming used by the topic catalogue (see docs/research/anzan-iama-formulas.md).
 * It is finer than `classifyMove` below: a carry whose complement needs the 5-bead in the *same*
 * column is a "mix" formula (+6 onto 7 carries, then −4 off 7 has to go −5+1), which the section
 * split calls `katta`. Both namings are kept: sections drive statistics, techniques drive topics.
 */
export type ColumnTechniqueId = 'direct' | 'small5' | 'big10' | 'mix';

export interface ColumnFact {
  /** 0 = ones, 1 = tens, 2 = hundreds… */
  column: number;
  /** Signed amount landing on this column, carry from the column below included. */
  amount: number;
  technique: ColumnTechniqueId;
}

export interface MoveFacts {
  /** Column-by-column reading of the move, starting at the ones column. */
  columns: readonly ColumnFact[];
  /** The ones column, which is what a topic is named after (0 when the move skips it). */
  onesAmount: number;
  onesTechnique: ColumnTechniqueId | null;
  /** Which round boundary the running total steps over: 100 wins over 50. */
  crossed: 0 | 50 | 100;
}

function columnTechnique(digit: number, amount: number): ColumnTechniqueId {
  const step = amount > 0 ? addToColumn(digit, amount) : subtractFromColumn(digit, -amount);
  if (!step.overflow) return step.technique === 'direct' ? 'direct' : 'small5';

  // A carry: the move is really ±10 ∓ complement, so read how that complement lands.
  const complement = 10 - Math.abs(amount);
  const rest = amount > 0 ? subtractFromColumn(digit, complement) : addToColumn(digit, complement);
  return rest.technique === 'direct' ? 'big10' : 'mix';
}

/**
 * Reads `total + value` the way a soroban does it, column by column, and reports the technique each
 * column needs plus the boundary (50 or 100) the total steps over. Topics are matched against this.
 */
export function describeMove(total: number, value: number): MoveFacts {
  if (!Number.isInteger(total) || total < 0) throw new RangeError(`Invalid total ${total}`);
  if (!Number.isInteger(value) || value === 0) throw new RangeError(`Invalid move ${value}`);
  if (total + value < 0) throw new RangeError(`Move ${value} would make total ${total} negative`);

  const sign = value > 0 ? 1 : -1;
  const columns: ColumnFact[] = [];
  let rest = Math.abs(value);
  let carry = 0;

  for (let column = 0; rest > 0 || carry > 0; column++) {
    // A column only ever sees its own digit of the total: lower columns reach it through the carry.
    const amount = (rest % 10) + carry;
    rest = Math.floor(rest / 10);
    carry = 0;

    if (amount > 0) {
      const digit = Math.floor(total / 10 ** column) % 10;
      // 9 plus a carry of 1 fills the column exactly: nothing moves here, the carry walks on.
      const technique = amount > 9 ? 'big10' : columnTechnique(digit, sign * amount);
      columns.push({ column, amount: sign * amount, technique });
      if (technique === 'big10' || technique === 'mix') carry = 1;
    }
  }

  const next = total + value;
  const crossed =
    Math.floor(total / 100) !== Math.floor(next / 100) ? 100 : total % 100 < 50 !== next % 100 < 50 ? 50 : 0;

  const ones = columns.find((fact) => fact.column === 0);
  return {
    columns,
    onesAmount: ones?.amount ?? 0,
    onesTechnique: ones?.technique ?? null,
    crossed,
  };
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
