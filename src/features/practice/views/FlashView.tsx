import type { FlashPhase } from '@/domain/practice/session';
import styles from '../Practice.module.css';
import { FlashDigits } from './FlashDigits';

interface FlashViewProps {
  problemNumber: number;
  problemCount: number;
  phase: FlashPhase;
  numbers: readonly number[];
  numberIndex: number;
  secondsPerNumber?: number;
}

export function FlashView({
  problemNumber,
  problemCount,
  phase,
  numbers,
  numberIndex,
}: FlashViewProps) {
  return (
    <div className={styles.stage}>
      <div className={styles.progress}>
        Misol {problemNumber}/{problemCount}
        {phase !== 'ready' && ` · ${numberIndex + 1}/${numbers.length}`}
      </div>
      <FlashDigits
        phase={phase}
        value={numbers[numberIndex]}
        isFirst={numberIndex === 0}
        className={styles.stageDigits}
      />
    </div>
  );
}
