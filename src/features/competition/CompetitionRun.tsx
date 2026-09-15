import { useEffect, useState } from 'react';
import type { Room } from '@/domain/competition';
import { DEFAULT_PRACTICE_CONFIG } from '@/domain/practice/config';
import { generateProblems } from '@/domain/practice/problem';
import { SECTION_META } from '@/features/practice/sections';
import { type PracticeProgress, PracticeRunner } from '@/features/practice/PracticeRunner';
import { toErrorMessage } from '@/shared/i18n/errorMessages';
import { useServices } from '@/shared/services/ServicesContext';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/Notice';
import styles from './Competition.module.css';

interface CompetitionRunProps {
  room: Room;
  studentId: string;
  onFinished: () => void;
  onDismiss: () => void;
}

export function CompetitionRun({ room, studentId, onFinished, onDismiss }: CompetitionRunProps) {
  const { competition, results } = useServices();
  const config = room.configs[studentId] ?? DEFAULT_PRACTICE_CONFIG;
  const [problems] = useState(() => generateProblems(config, Math.random));
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<'idle' | 'countdown' | 'running'>('idle');
  const [count, setCount] = useState(3);

  useEffect(() => {
    if (stage !== 'countdown') return;

    const interval = window.setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setStage('running');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [stage]);

  const handleStart = () => {
    setCount(3);
    setStage('countdown');
  };

  const handleProgress = async ({ answered, correct, total, finished }: PracticeProgress) => {
    try {
      if (finished) {
        onFinished();
        await results.record({ studentId, config, correct, total, mode: 'online', roomId: room.id });
      }
      await competition.reportProgress(room.id, studentId, { answered, correct, finished });
    } catch (caught) {
      setError(toErrorMessage(caught));
    }
  };

  if (stage === 'idle') {
    const sectionInfo = SECTION_META[config.section];
    return (
      <Card title="Musobaqa boshlandi!">
        <div className={styles.startCard}>
          <p className={styles.startPrompt}>Ustoz musobaqani boshladi. Tayyor bo'lsangiz, tugmani bosing!</p>
          <div className={styles.startMeta}>
            <span className={styles.startBadge}>{sectionInfo.label}</span>
            <span className={styles.startBadge}>{config.rowCount} qator</span>
            <span className={styles.startBadge}>{config.secondsPerNumber} s</span>
            <span className={styles.startBadge}>{config.problemCount} ta misol</span>
          </div>
          <Button tone="coral" block onClick={handleStart}>
            Boshlash!
          </Button>
        </div>
      </Card>
    );
  }

  if (stage === 'countdown') {
    return (
      <div className={styles.countdownStage}>
        <div className={styles.countdownLabel}>Tayyor turing…</div>
        <div key={count} className={styles.countdownNumber}>
          {count > 0 ? count : 'Boshladik!'}
        </div>
      </div>
    );
  }

  return (
    <PracticeRunner
      problems={problems}
      secondsPerNumber={config.secondsPerNumber}
      onProgress={handleProgress}
      summaryActions={
        <>
          <ErrorMessage>{error}</ErrorMessage>
          <Button tone="violet" block onClick={onDismiss}>
            Yopish
          </Button>
        </>
      }
    />
  );
}

