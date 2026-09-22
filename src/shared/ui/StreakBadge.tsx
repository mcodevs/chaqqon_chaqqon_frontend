import type { CalendarDate } from '@/domain/billing';
import { type StreakInfo, daysSinceLastActive } from '@/domain/streak';
import styles from './StreakBadge.module.css';

interface StreakBadgeProps {
  streak: StreakInfo;
  today: CalendarDate;
}

/** How long a gap we spell out before falling back to "hali mashq qilmagan". */
const MAX_GAP_DAYS = 30;

function streakGapLabel(streak: StreakInfo, today: CalendarDate): string {
  const gap = daysSinceLastActive(streak, today);
  if (gap === null) return 'Hali mashq qilmagan';
  if (gap > MAX_GAP_DAYS) return 'Uzoq vaqt yoʻq';
  return `${gap} kundan beri yoʻq`;
}

/** The teacher's roster marker: a live streak, a resting one, or how long the student has been away. */
export function StreakBadge({ streak, today }: StreakBadgeProps) {
  if (streak.current === 0) {
    return (
      <span className={`${styles.badge} ${styles.idle}`} title="Ketma-ket mashq kunlari">
        {streakGapLabel(streak, today)}
      </span>
    );
  }

  return (
    <span
      className={`${styles.badge} ${streak.activeToday ? styles.live : styles.resting}`}
      title={
        streak.activeToday
          ? `${streak.current} kun ketma-ket · bugun bajarildi`
          : `${streak.current} kun ketma-ket · bugun hali mashq qilmagan`
      }
    >
      <span className={styles.icon} aria-hidden="true">
        🔥
      </span>
      {streak.current} kun
    </span>
  );
}
