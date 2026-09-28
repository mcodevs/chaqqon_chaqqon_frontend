import type { PracticeConfig } from '@/domain/practice/config';
import { sorobanRods } from '@/domain/practice/drills';
import type { FlashPhase } from '@/domain/practice/session';
import styles from '../Practice.module.css';
import { FlashDigits } from './FlashDigits';
import { FlashSoroban } from './FlashSoroban';

interface FlashViewProps {
  config: PracticeConfig;
  problemNumber: number;
  problemCount: number;
  phase: FlashPhase;
  numbers: readonly number[];
  numberIndex: number;
}

export function FlashView({
  config,
  problemNumber,
  problemCount,
  phase,
  numbers,
  numberIndex,
}: FlashViewProps) {
  const isCard = config.kind === 'soroban';

  return (
    <div className={styles.stage}>
      <div className={styles.progress}>
        {isCard ? 'Karta' : 'Misol'} {problemNumber}/{problemCount}
        {/* A card is a single number, so counting the rows inside it would always read "1/1". */}
        {!isCard && phase !== 'ready' && ` · ${numberIndex + 1}/${numbers.length}`}
      </div>
      {isCard ? (
        <FlashSoroban phase={phase} value={numbers[numberIndex]} rods={sorobanRods(config.digitCount)} />
      ) : (
        <FlashDigits
          phase={phase}
          value={numbers[numberIndex]}
          isFirst={numberIndex === 0}
          className={styles.stageDigits}
        />
      )}
    </div>
  );
}
