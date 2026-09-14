import type { Problem } from '@/domain/practice/problem';
import { formatSigned } from '@/shared/format';
import styles from '../Practice.module.css';

interface ColumnSumProps {
  problem: Problem;
  /** Shown under the sum when given; null means no answer was entered. */
  userAnswer?: number | null;
  compact?: boolean;
}

/** Shows a problem as a written column sum so a mistake can be reviewed step by step. */
export function ColumnSum({ problem, userAnswer, compact = false }: ColumnSumProps) {
  return (
    <div className={`${styles.column} ${compact ? styles.columnCompact : ''}`}>
      {problem.numbers.map((value, index) => {
        const { sign, magnitude } = formatSigned(value, index === 0);
        return (
          <div key={index} className={styles.columnRow}>
            <span className={styles.columnSign}>{sign}</span>
            <span className={styles.columnValue}>{magnitude}</span>
          </div>
        );
      })}
      <div className={styles.columnLine} />
      <div className={`${styles.columnRow} ${styles.columnTotal}`}>
        <span className={styles.columnSign} />
        <span className={styles.columnValue}>{problem.answer}</span>
      </div>
      {userAnswer !== undefined && (
        <div className={styles.columnYours}>
          Sizning javobingiz: <b>{userAnswer ?? '—'}</b>
        </div>
      )}
    </div>
  );
}
