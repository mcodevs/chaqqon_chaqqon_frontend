import type { CSSProperties } from 'react';
import styles from '../Practice.module.css';

interface TimerBarProps {
  running: boolean;
  durationMs: number;
  /** Changes whenever the countdown should start over. */
  restartKey: string;
}

export function TimerBar({ running, durationMs, restartKey }: TimerBarProps) {
  return (
    <div className={styles.timerTrack}>
      {running && (
        <div
          key={restartKey}
          className={styles.timerFill}
          style={{ animationDuration: `${durationMs}ms` } as CSSProperties}
        />
      )}
    </div>
  );
}
