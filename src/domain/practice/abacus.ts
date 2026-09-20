import { addToColumn, subtractFromColumn } from './soroban';

/*
 * The abacus a child actually touches. `soroban.ts` answers "which formula does this move
 * need?"; this file answers "which bead moves, and in what order?" — the bead state of a rod,
 * what a click on a bead does, and the step-by-step plan for adding or subtracting a number.
 *
 * A rod holds one heaven bead (worth 5, above the bar) and four earth beads (worth 1 each,
 * below it). Digits are indexed from the ones rod: index 0 = ones, 1 = tens, …
 */

/** Earth beads on one rod. */
export const EARTH_BEADS = 4;

/** Rods shown by default: three-digit practice plus room for the carries above it. */
export const DEFAULT_RODS = 5;

export const MIN_RODS = 3;
export const MAX_RODS = 7;

/** U+2212, so "−4" lines up with the digits instead of sitting high like a hyphen. */
const MINUS = '−';

export interface RodBeads {
  /** True when the 5-bead is pulled down to the bar. */
  heaven: boolean;
  /** How many earth beads are pushed up to the bar, 0…4. */
  earth: number;
}

function assertDigit(digit: number) {
  if (!Number.isInteger(digit) || digit < 0 || digit > 9) throw new RangeError(`Invalid digit ${digit}`);
}

export function beadsOf(digit: number): RodBeads {
  assertDigit(digit);
  return { heaven: digit >= 5, earth: digit % 5 };
}

export function digitOf(beads: RodBeads): number {
  return (beads.heaven ? 5 : 0) + beads.earth;
}

/** The largest number `rods` rods can hold. */
export function maxValue(rods: number): number {
  return 10 ** rods - 1;
}

/** `digits[0]` is the ones rod. */
export function toDigits(value: number, rods: number): number[] {
  return Array.from({ length: rods }, (_, column) => digitAt(value, column));
}

export function toValue(digits: readonly number[]): number {
  return digits.reduce((sum, digit, column) => sum + digit * 10 ** column, 0);
}

export function digitAt(value: number, column: number): number {
  return Math.floor(value / 10 ** column) % 10;
}

export function withDigit(value: number, column: number, digit: number): number {
  assertDigit(digit);
  return value + (digit - digitAt(value, column)) * 10 ** column;
}

/** Clicking the 5-bead pulls it to the bar, or pushes it back up. */
export function toggleHeaven(digit: number): number {
  const beads = beadsOf(digit);
  return digitOf({ ...beads, heaven: !beads.heaven });
}

/**
 * Clicking earth bead `index` (0 = the one nearest the bar). A counted bead goes back down
 * with every bead below it, an uncounted one comes up with every bead above it — a finger
 * moves the whole stack, never a single bead out of the middle.
 */
export function toggleEarth(digit: number, index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= EARTH_BEADS)
    throw new RangeError(`Invalid earth bead ${index}`);

  const beads = beadsOf(digit);
  return digitOf({ ...beads, earth: index < beads.earth ? index : index + 1 });
}

/* ------------------------------------------------------------------ *
 * Teaching a move, bead by bead
 * ------------------------------------------------------------------ */

/** What the beads of one rod do in a step: move as they are, or through the 5-bead. */
export type StepKind = 'direct' | 'small5';

export interface MoveStep {
  /** 0 = ones rod. */
  column: number;
  /** Signed amount this step puts on that rod; ±1…9, or ±1 when it is the carry. */
  amount: number;
  kind: StepKind;
  /** The formula the step belongs to — "+3 = +5 − 2", "+6 = +10 − 4" — empty when beads suffice. */
  formula: string;
  /** What the child does, in words. */
  text: string;
  /** The whole board after the step. */
  value: number;
  /** True for the ±1 that a 10-complement sends into the next rod. */
  carry: boolean;
}

const COLUMN_NAMES = ['Birlar', "O'nlar", 'Yuzlar', 'Minglar', "O'n minglar", 'Yuz minglar', 'Millionlar'];

/** Uzbek name of a place value — "Birlar", "O'nlar", … */
export function columnName(column: number): string {
  return COLUMN_NAMES[column] ?? `10^${column}`;
}

/** A move as it is written on a chip: "+6", "\u22124". */
export function signedText(amount: number): string {
  return `${amount > 0 ? '+' : MINUS}${Math.abs(amount)}`;
}

/** "+3 = +5 − 2" — the 5-complement (small friend). */
function fiveFormula(amount: number): string {
  const rest = 5 - Math.abs(amount);
  return amount > 0 ? `+${amount} = +5 ${MINUS} ${rest}` : `${MINUS}${-amount} = ${MINUS}5 + ${rest}`;
}

/** "+6 = +10 − 4" — the 10-complement (big friend). */
function tenFormula(amount: number): string {
  const rest = 10 - Math.abs(amount);
  return amount > 0 ? `+${amount} = +10 ${MINUS} ${rest}` : `${MINUS}${-amount} = ${MINUS}10 + ${rest}`;
}

function instruction(column: number, amount: number, kind: StepKind): string {
  const name = columnName(column);
  const size = Math.abs(amount);

  if (kind === 'direct') {
    return amount > 0 ? `${name} xonasiga ${size} ni qo'shing` : `${name} xonasidan ${size} ni oling`;
  }

  // The 5-bead comes down to be counted and goes up to be taken away.
  const rest = 5 - size;
  return amount > 0
    ? `${name} xonasida 5 likni tushiring va ${rest} ni oling`
    : `${name} xonasida 5 likni ko'taring va ${rest} ni qo'shing`;
}

type StepRole =
  | { role: 'plain' }
  /** The complement half of a 10-formula, on the rod the move started on. */
  | { role: 'complement'; formula: string }
  /** The ±1 that same formula sends one rod to the left. */
  | { role: 'carry'; formula: string };

/*
 * The sentence the child reads. It names the technique but not the formula, which travels
 * beside it in `formula` — except the 5-complement a big-friend step needs on the way, which
 * has nowhere else to be shown.
 */
function stepText(column: number, amount: number, kind: StepKind, context: StepRole): string {
  const body = instruction(column, amount, kind);

  switch (context.role) {
    case 'complement':
      return kind === 'small5' ? `Katta do'st: ${body} (${fiveFormula(amount)})` : `Katta do'st: ${body}`;
    case 'carry':
      return amount > 0 ? `O'tkazma: ${body}` : `Qarz: ${body}`;
    case 'plain':
      return kind === 'small5' ? `Kichik do'st: ${body}` : body;
  }
}

/**
 * Walks `value` onto `total` the way it is taught: one rod at a time starting at the ones,
 * and a move that does not fit the rod becomes its 10-complement plus a carry into the next
 * rod — which is planned the same way, so a cascade (95 + 8) simply keeps going.
 */
export function planMove(total: number, value: number, rods: number = DEFAULT_RODS): MoveStep[] {
  const limit = maxValue(rods);
  if (!Number.isInteger(total) || total < 0 || total > limit)
    throw new RangeError(`Total ${total} does not fit on ${rods} rods`);
  if (!Number.isInteger(value) || value === 0) throw new RangeError(`Invalid move ${value}`);

  const result = total + value;
  if (result < 0 || result > limit) throw new RangeError(`Move ${value} takes ${total} off the abacus`);

  const steps: MoveStep[] = [];
  const sign = Math.sign(value);
  let current = total;

  for (let column = 0, rest = Math.abs(value); rest > 0; column++, rest = Math.floor(rest / 10)) {
    const amount = rest % 10;
    if (amount > 0) current = applyAmount(steps, current, column, sign * amount, { role: 'plain' });
  }

  return steps;
}

function applyAmount(
  steps: MoveStep[],
  value: number,
  column: number,
  amount: number,
  context: StepRole,
): number {
  const digit = digitAt(value, column);
  const size = Math.abs(amount);
  const move = amount > 0 ? addToColumn(digit, size) : subtractFromColumn(digit, size);

  if (move.technique === 'bigFriend') {
    // The rod cannot hold the move, so it becomes ±10 ∓ complement: the complement is always
    // small enough for this rod (digit ≥ 10 − size when adding, digit + 10 − size ≤ 9 when taking).
    const formula = tenFormula(amount);
    const complement = -Math.sign(amount) * (10 - size);
    const afterComplement = applyAmount(steps, value, column, complement, { role: 'complement', formula });
    return applyAmount(steps, afterComplement, column + 1, Math.sign(amount), { role: 'carry', formula });
  }

  const kind: StepKind = move.technique === 'direct' ? 'direct' : 'small5';
  const next = value + amount * 10 ** column;

  steps.push({
    column,
    amount,
    kind,
    formula: context.role === 'plain' ? (kind === 'small5' ? fiveFormula(amount) : '') : context.formula,
    text: stepText(column, amount, kind, context),
    value: next,
    carry: context.role === 'carry',
  });

  return next;
}

/** The same move written the way it is read aloud: "7 + 6 = 13". */
export function moveExpression(total: number, value: number): string {
  return `${total} ${value > 0 ? '+' : MINUS} ${Math.abs(value)} = ${total + value}`;
}
