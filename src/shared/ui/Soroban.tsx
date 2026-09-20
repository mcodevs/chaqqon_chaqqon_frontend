import type { CSSProperties } from 'react';
import {
  EARTH_BEADS,
  beadsOf,
  columnName,
  toDigits,
  toggleEarth,
  toggleHeaven,
  withDigit,
} from '@/domain/practice/abacus';
import styles from './Soroban.module.css';

interface SorobanProps {
  /** The number standing on the rods; digits that do not fit are not shown. */
  value: number;
  rods: number;
  /** Given, the beads can be moved; without it the abacus is only read. */
  onChange?: (value: number) => void;
  /** Rod being worked on right now (0 = ones), lit so the eye lands on it. */
  highlight?: number | null;
  size?: 'sm' | 'md' | 'lg';
  /** The digit each rod is holding, printed under the frame. */
  showDigits?: boolean;
  label?: string;
}

/**
 * A soroban the child can touch: the 5-bead above the bar, four 1-beads below it,
 * on as many rods as the drill needs. Every bead is a real button, so the abacus
 * works with a finger, a mouse and a keyboard alike.
 */
export function Soroban({
  value,
  rods,
  onChange,
  highlight = null,
  size = 'md',
  showDigits = true,
  label = 'Abakus',
}: SorobanProps) {
  const digits = toDigits(value, rods);
  // Rods are drawn most significant first; digit 0 (the ones) is the rightmost.
  const columns = Array.from({ length: rods }, (_, index) => rods - 1 - index);

  const setDigit = (column: number, digit: number) => onChange?.(withDigit(value, column, digit));

  return (
    <div className={[styles.frame, styles[size]].join(' ')} style={{ '--rods': rods } as CSSProperties}>
      <div className={styles.board} role="group" aria-label={`${label}: ${value}`}>
        {columns.map((column) => (
          <div
            key={`heaven-${column}`}
            className={styles.cell}
            data-highlight={column === highlight || undefined}
          >
            <span className={styles.rail} />
            <Bead
              className={styles.heavenBead}
              active={beadsOf(digits[column]).heaven}
              label={`${columnName(column)} xonasi, 5 lik tosh`}
              onClick={onChange && (() => setDigit(column, toggleHeaven(digits[column])))}
            />
          </div>
        ))}

        <div className={styles.bar}>
          {columns.map(
            (column, index) =>
              // Every third rod from the ones carries a unit mark.
              column % 3 === 0 && (
                <span
                  key={`dot-${column}`}
                  className={styles.dot}
                  style={{ left: `${((index + 0.5) / rods) * 100}%` }}
                />
              ),
          )}
        </div>

        {columns.map((column) => (
          <div
            key={`earth-${column}`}
            className={`${styles.cell} ${styles.earthCell}`}
            data-highlight={column === highlight || undefined}
          >
            <span className={styles.rail} />
            {Array.from({ length: EARTH_BEADS }, (_, index) => (
              <Bead
                key={index}
                className={styles.earthBead}
                index={index}
                active={index < beadsOf(digits[column]).earth}
                label={`${columnName(column)} xonasi, ${index + 1}-tosh`}
                onClick={onChange && (() => setDigit(column, toggleEarth(digits[column], index)))}
              />
            ))}
          </div>
        ))}
      </div>

      {showDigits && (
        <div className={styles.digits} aria-hidden="true">
          {columns.map((column) => (
            <span key={column} className={styles.digit} data-highlight={column === highlight || undefined}>
              {digits[column]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface BeadProps {
  className: string;
  active: boolean;
  label: string;
  index?: number;
  onClick?: (() => void) | undefined;
}

function Bead({ className, active, label, index = 0, onClick }: BeadProps) {
  const style = { '--i': index } as CSSProperties;
  const classes = `${styles.bead} ${className}`;

  // A read-only abacus is a picture: it should not put two dozen dead buttons in the tab order.
  if (!onClick) {
    return <span className={classes} style={style} data-active={active || undefined} aria-hidden="true" />;
  }

  return (
    <button
      type="button"
      className={classes}
      style={style}
      data-active={active || undefined}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
    />
  );
}
