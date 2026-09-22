import { useRef, useState } from 'react';
import { DEFAULT_PRACTICE_CONFIG, type PracticeConfig } from '@/domain/practice/config';
import { type Problem, generateProblems } from '@/domain/practice/problem';
import { useCurrentStudent } from '@/features/student/CurrentStudentContext';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useStudentStreak } from '@/shared/services/queries';
import { useServices } from '@/shared/services/ServicesContext';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/Notice';
import styles from './Practice.module.css';
import { PracticeConfigFields } from './PracticeConfigFields';
import { type PracticeProgress, PracticeRunner } from './PracticeRunner';

interface PracticeRun {
  id: number;
  config: PracticeConfig;
  problems: Problem[];
}

export function PracticePage() {
  const student = useCurrentStudent();
  const { results } = useServices();
  const streak = useStudentStreak(student.id);
  const [config, setConfig] = useState(DEFAULT_PRACTICE_CONFIG);
  const [run, setRun] = useState<PracticeRun | null>(null);
  const [saved, setSaved] = useState(false);
  const recordResult = useAsyncAction(results.record);
  const nextRunId = useRef(0);

  const start = () => {
    setSaved(false);
    setRun({ id: ++nextRunId.current, config, problems: generateProblems(config, Math.random) });
  };

  const handleProgress = async (progress: PracticeProgress) => {
    if (!run || !progress.finished) return;
    const recorded = await recordResult.run({
      studentId: student.id,
      config: run.config,
      correct: progress.correct,
      total: progress.total,
      mode: 'practice',
      roomId: null,
    });
    setSaved(recorded !== undefined);
  };

  if (!run) {
    return (
      <Card title="Mashqni sozlang">
        <PracticeConfigFields value={config} onChange={setConfig} />
        <Button size="lg" block onClick={start}>
          Boshlash!
        </Button>
      </Card>
    );
  }

  return (
    <PracticeRunner
      key={run.id}
      problems={run.problems}
      secondsPerNumber={run.config.secondsPerNumber}
      onProgress={handleProgress}
      summaryActions={
        <>
          {saved && <div className={styles.summaryNote}>Natija saqlandi ✓</div>}
          {saved && streak !== undefined && streak.current > 0 && (
            <div className={styles.summaryStreak}>
              🔥 {streak.current} kun ketma-ket
              {streak.current === streak.longest && streak.current > 1 ? ' — eng uzun natijang!' : ''}
            </div>
          )}
          <ErrorMessage>{recordResult.error}</ErrorMessage>
          <Button size="lg" block onClick={() => setRun(null)}>
            Yana mashq qilish
          </Button>
        </>
      }
    />
  );
}
