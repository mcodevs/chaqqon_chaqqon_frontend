import type { ReactNode } from 'react';
import { NameAvatar } from '@/shared/ui/NameAvatar';
import styles from './Classroom.module.css';

interface LanePanelProps {
  name: string;
  avatarUrl?: string | null;
  correct: number;
  verdict?: 'good' | 'bad';
  children: ReactNode;
}

/** One student's share of the split screen. */
export function LanePanel({ name, avatarUrl, correct, verdict, children }: LanePanelProps) {
  return (
    <section className={`${styles.lane} ${verdict ? styles[verdict] : ''}`} aria-label={name}>
      <header className={styles.laneHeader}>
        <NameAvatar name={name} avatarUrl={avatarUrl} size={36} />
        <span className={styles.laneName}>{name}</span>
        <span className={styles.laneScore} aria-label={`${correct} ta to'g'ri`}>
          {correct} ✓
        </span>
      </header>
      <div className={styles.laneBody}>{children}</div>
    </section>
  );
}
