import type { StudentStarsBalance } from '@/domain/market';
import styles from './StarsBadge.module.css';

interface StarsBadgeProps {
  /** Undefined while the balance is still loading, or for a student with no record yet. */
  balance?: StudentStarsBalance;
}

/** A student's spendable star balance, with what they earned and spent in the tooltip. */
export function StarsBadge({ balance }: StarsBadgeProps) {
  const spendable = balance?.balance ?? 0;

  return (
    <span
      className={`${styles.badge} ${spendable === 0 ? styles.empty : ''}`}
      title={`Yulduzchalar · ishlab topgan: ${balance?.earnedStars ?? 0}, sarflagan: ${balance?.spentStars ?? 0}`}
    >
      <span className={styles.icon} aria-hidden="true">
        ⭐
      </span>
      {spendable}
    </span>
  );
}
