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
 * Names the section that teaches adding `value` (±1…9) to `total`:
 * - formulasiz — ones column only, beads are enough;
 * - kichik     — ones column only, needs the 5-complement;
 * - katta      — needs the 10-complement and the ±1 lands directly on the next column;
 * - miks       — the ±1 itself needs a formula on the next column (a "family" cascade).
 */
export function classifyMove(total: number, value: number): SectionId {
  const amount = Math.abs(value);
  if (!Number.isInteger(total) || total < 0) throw new RangeError(`Invalid total ${total}`);
  if (!Number.isInteger(value) || amount < 1 || amount > 9)
    throw new RangeError(`Move must be ±1…9, got ${value}`);
  if (total + value < 0) throw new RangeError(`Move ${value} would make total ${total} negative`);

  const applyToColumn = value > 0 ? addToColumn : subtractFromColumn;
  const techniques: ColumnTechnique[] = [];
  let higherColumns = total;
  let pending = amount;

  while (pending > 0) {
    const step = applyToColumn(higherColumns % 10, pending);
    techniques.push(step.technique);
    pending = step.overflow ? 1 : 0;
    higherColumns = Math.floor(higherColumns / 10);
  }

  return categorize(techniques);
}

function categorize([first, ...carried]: ColumnTechnique[]): SectionId {
  if (carried.length === 0) return first === 'smallFriend' ? 'kichik' : 'formulasiz';
  return carried.every((technique) => technique === 'direct') ? 'katta' : 'miks';
}
