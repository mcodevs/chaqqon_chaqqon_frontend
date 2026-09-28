import type { PracticeConfig } from '@/domain/practice/config';
import { sorobanRods } from '@/domain/practice/drills';
import type { ProblemAttempt } from '@/domain/practice/session';
import { Button } from '@/shared/ui/Button';
import { Soroban } from '@/shared/ui/Soroban';
import styles from '../Practice.module.css';
import { CardAnswer } from './CardAnswer';
import { ColumnSum } from './ColumnSum';

interface FeedbackViewProps {
  config: PracticeConfig;
  attempt: ProblemAttempt;
  isLast: boolean;
  onNext: () => void;
}

export function FeedbackView({ config, attempt, isLast, onNext }: FeedbackViewProps) {
  const isCard = config.kind === 'soroban';
  return (
    <div className={styles.stage}>
      <div role="status" className={`${styles.banner} ${attempt.isCorrect ? styles.good : styles.bad}`}>
        {attempt.isCorrect ? "To'g'ri! 🎉" : "Noto'g'ri"}
      </div>
      {isCard ? (
        // The card stays on screen with its digits shown, so the missed rod is the lesson.
        <div className={styles.flashCard}>
          <Soroban
            value={attempt.problem.answer}
            rods={sorobanRods(config.digitCount)}
            size="lg"
            label="Karta javobi"
          />
          <CardAnswer attempt={attempt} />
        </div>
      ) : (
        !attempt.isCorrect && <ColumnSum problem={attempt.problem} userAnswer={attempt.answer} />
      )}
      <Button size="lg" block autoFocus onClick={onNext} className={styles.nextButton}>
        {isLast ? 'Yakunlash' : isCard ? 'Keyingi karta' : 'Keyingi misol'}
      </Button>
    </div>
  );
}
