import type { ProblemAttempt } from '@/domain/practice/session';
import styles from '../Practice.module.css';

interface CardAnswerProps {
  attempt: ProblemAttempt;
  compact?: boolean;
}

/** What a soroban card was, next to what was read off it. The card's answer is the card itself. */
export function CardAnswer({ attempt, compact = false }: CardAnswerProps) {
  return (
    <div className={compact ? styles.cardAnswerCompact : styles.cardAnswer}>
      <span className={styles.cardAnswerValue}>{attempt.problem.answer}</span>
      {!attempt.isCorrect && (
        <span className={styles.cardAnswerGiven}>Javobingiz: {attempt.answer ?? '—'}</span>
      )}
    </div>
  );
}
