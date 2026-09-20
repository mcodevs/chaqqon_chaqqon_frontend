import { DigitCharacter } from './DigitCharacter';
import styles from './LoadingScreen.module.css';

export function LoadingScreen({ label = 'Yuklanmoqda...' }: { label?: string }) {
  return (
    <div className={styles.screen} role="status">
      <DigitCharacter digit={7} size={64} animated />
      <span className={styles.label}>{label}</span>
    </div>
  );
}

/** One shimmering block; give it the size of the content it stands in for. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius,
}: {
  width?: number | string;
  height?: number | string;
  radius?: string;
}) {
  return (
    <span className={styles.skeleton} aria-hidden="true" style={{ width, height, borderRadius: radius }} />
  );
}

/** Placeholder for a list of people or rows, matching the real row's rhythm. */
export function SkeletonList({ rows = 4, avatar = true }: { rows?: number; avatar?: boolean }) {
  return (
    <div className={styles.skeletonList} role="status" aria-label="Yuklanmoqda">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className={styles.skeletonRow}>
          {avatar && <Skeleton width={40} height={40} radius="var(--radius-full)" />}
          <span className={styles.skeletonLines}>
            <Skeleton width={`${60 - index * 5}%`} height={14} />
            <Skeleton width={`${40 - index * 3}%`} height={11} />
          </span>
        </div>
      ))}
    </div>
  );
}
