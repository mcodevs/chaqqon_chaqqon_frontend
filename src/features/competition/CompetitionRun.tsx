import { useEffect, useState } from 'react';
import type { Room } from '@/domain/competition';
import { fullName, type Student } from '@/domain/users';
import { DEFAULT_PRACTICE_CONFIG } from '@/domain/practice/config';
import { generateDrillProblems } from '@/domain/practice/drills';
import { DRILL_META, SECTION_META } from '@/features/practice/sections';
import { type PracticeProgress, PracticeRunner } from '@/features/practice/PracticeRunner';
import { drillDetail } from '@/features/share/resultCard';
import { ShareResult } from '@/features/share/ShareResult';
import { toErrorMessage } from '@/shared/i18n/errorMessages';
import { useSchoolToday } from '@/shared/services/queries';
import { useServices } from '@/shared/services/ServicesContext';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/Notice';
import styles from './Competition.module.css';

interface CompetitionRunProps {
  room: Room;
  /** Whose run it is; the name goes on the picture the child shares. */
  student: Student;
  onFinished: () => void;
  onDismiss: () => void;
}

export function CompetitionRun({ room, student, onFinished, onDismiss }: CompetitionRunProps) {
  const studentId = student.id;
  const today = useSchoolToday();
  const { competition, results } = useServices();
  const config = room.configs[studentId] ?? DEFAULT_PRACTICE_CONFIG;
  const [problems] = useState(() => generateDrillProblems(config, Math.random));
  const [error, setError] = useState<string | null>(null);
  /** The finished score, kept for the shareable picture under the summary. */
  const [score, setScore] = useState({ correct: 0, total: config.problemCount });
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
        setScore({ correct, total });
        onFinished();
        await results.record({ studentId, config, correct, total, mode: 'online', roomId: room.id });
      }
      await competition.reportProgress(room.id, studentId, { answered, correct, finished });
    } catch (caught) {
      setError(toErrorMessage(caught));
    }
  };

  if (stage === 'idle') {
    const isCard = config.kind === 'soroban';
    // A card drill practises no formula, so it shows what it does drill: how wide and how many.
    const badges = isCard
      ? [`${config.digitCount} xonali`, `${config.secondsPerNumber} s`, `${config.problemCount} ta karta`]
      : [`${config.rowCount} qator`, `${config.secondsPerNumber} s`, `${config.problemCount} ta misol`];
    return (
      <Card title="Musobaqa boshlandi!">
        <div className={styles.startCard}>
          <p className={styles.startPrompt}>Ustoz musobaqani boshladi. Tayyor bo'lsangiz, tugmani bosing!</p>
          <div className={styles.startMeta}>
            <span className={styles.startBadge}>
              {isCard ? DRILL_META.soroban.short : SECTION_META[config.section].label}
            </span>
            {badges.map((badge) => (
              <span key={badge} className={styles.startBadge}>
                {badge}
              </span>
            ))}
          </div>
          <Button size="lg" block onClick={handleStart}>
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
      config={config}
      onProgress={handleProgress}
      summaryActions={
        <>
          <ErrorMessage>{error}</ErrorMessage>
          <Button size="lg" block onClick={onDismiss}>
            Yopish
          </Button>
          <ShareResult
            title="Interaktiv uy vazifasi"
            name={fullName(student)}
            detail={drillDetail(config)}
            correct={score.correct}
            total={score.total}
            today={today}
          />
        </>
      }
    />
  );
}
