import type { ReactNode } from 'react';
import { accuracyPercent } from '@/domain/results';
import type { ProblemAttempt } from '@/domain/practice/session';
import { Card } from '@/shared/ui/Card';
import styles from '../Practice.module.css';
import { ColumnSum } from './ColumnSum';

interface SummaryViewProps {
  attempts: readonly ProblemAttempt[];
  actions?: ReactNode;
}

export function SummaryView({ attempts, actions }: SummaryViewProps) {
  const correct = attempts.filter((attempt) => attempt.isCorrect).length;

  return (
    <>
      <Card className={styles.summary}>
        <h3>Mashq yakunlandi!</h3>
        <div className={styles.summaryScore}>{accuracyPercent(correct, attempts.length)}%</div>
        <div className={styles.summarySub}>
          {correct}/{attempts.length} ta misol to'g'ri
        </div>
        {actions}
      </Card>

      <Card title="Misollar tarixi">
        <ol className={styles.history}>
          {attempts.map((attempt, index) => (
            <li key={index} className={styles.historyItem}>
              <span className={`${styles.historyBadge} ${attempt.isCorrect ? styles.good : styles.bad}`}>
                {index + 1}
              </span>
              {attempt.isCorrect ? (
                <span className={styles.historyOk}>To'g'ri · javob: {attempt.problem.answer}</span>
              ) : (
                <ColumnSum problem={attempt.problem} userAnswer={attempt.answer} compact />
              )}
            </li>
          ))}
        </ol>
      </Card>
    </>
  );
}
