import type { CSSProperties } from 'react';
import type { Problem } from '@/domain/practice/problem';
import { formatSigned } from '@/shared/format';
import styles from '../Practice.module.css';

interface ColumnProblemProps {
  problem: Problem;
  /** Announce the rows to screen readers; off when several panels show their own column. */
  announce?: boolean;
}

/**
 * The column drill's problem: every row at once, read rather than remembered. The rows share one
 * size so the column reads as a single sum, and that size shrinks as the problem grows — ten rows
 * still have to fit a phone without scrolling, which is what would break the child's counting.
 */
export function ColumnProblem({ problem, announce = true }: ColumnProblemProps) {
  const rows = problem.numbers.length;

  return (
    <div
      className={styles.problemColumn}
      style={{ '--column-rows': rows } as CSSProperties}
      aria-live={announce ? 'polite' : 'off'}
    >
      {problem.numbers.map((value, index) => {
        const { sign, magnitude } = formatSigned(value, false);
        return (
          <div key={index} className={`${styles.problemRow} ${value < 0 ? styles.problemRowNegative : ''}`}>
            <span className={styles.problemSign}>{sign}</span>
            <span className={styles.problemValue}>{magnitude}</span>
          </div>
        );
      })}
    </div>
  );
}
