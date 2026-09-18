import { useEffect } from 'react';
import type { ProblemAttempt } from '@/domain/practice/session';
import { triggerHaptic } from '@/shared/telegram/telegramWebApp';
import { Button } from '@/shared/ui/Button';
import styles from '../Practice.module.css';
import { ColumnSum } from './ColumnSum';

interface FeedbackViewProps {
  attempt: ProblemAttempt;
  isLast: boolean;
  onNext: () => void;
}

export function FeedbackView({ attempt, isLast, onNext }: FeedbackViewProps) {
  useEffect(() => {
    triggerHaptic(attempt.isCorrect ? 'success' : 'error');
  }, [attempt.isCorrect]);
  return (
    <div className={styles.stage}>
      <div role="status" className={`${styles.banner} ${attempt.isCorrect ? styles.good : styles.bad}`}>
        {attempt.isCorrect ? "To'g'ri! 🎉" : "Noto'g'ri"}
      </div>
      {!attempt.isCorrect && <ColumnSum problem={attempt.problem} userAnswer={attempt.answer} />}
      <Button tone="blue" block autoFocus onClick={onNext} className={styles.nextButton}>
        {isLast ? 'Yakunlash' : 'Keyingi misol'}
      </Button>
    </div>
  );
}
