import { useRef, useState } from 'react';
import { DEFAULT_PRACTICE_CONFIG, PRACTICE_KINDS, type PracticeConfig } from '@/domain/practice/config';
import { generateDrillProblems } from '@/domain/practice/drills';
import type { Problem } from '@/domain/practice/problem';
import { useCurrentStudent, useStudentOpen } from '@/features/student/CurrentStudentContext';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useStudentStreak } from '@/shared/services/queries';
import { useServices } from '@/shared/services/ServicesContext';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ErrorMessage } from '@/shared/ui/Notice';
import styles from './Practice.module.css';
import { PracticeConfigFields } from './PracticeConfigFields';
import { type PracticeProgress, PracticeRunner } from './PracticeRunner';
import { RECORDED_KINDS } from './sections';
import { useDrillKinds } from './useDrillKinds';

interface PracticeRun {
  id: number;
  config: PracticeConfig;
  problems: Problem[];
}

export function PracticePage() {
  const student = useCurrentStudent();
  // A closed subscription still practises; the result just is not written down.
  const subscribed = useStudentOpen();
  const { results } = useServices();
  const streak = useStudentStreak(student.id);
  const [config, setConfig] = useState(DEFAULT_PRACTICE_CONFIG);
  const [run, setRun] = useState<PracticeRun | null>(null);
  const [saved, setSaved] = useState(false);
  const recordResult = useAsyncAction(results.record);
  const nextRunId = useRef(0);
  // Chaqnovchi va ustunlar mashqlari ustozning tarifida bo'lsagina ochiladi.
  const kinds = useDrillKinds(PRACTICE_KINDS);

  const start = () => {
    setSaved(false);
    setRun({ id: ++nextRunId.current, config, problems: generateDrillProblems(config, Math.random) });
  };

  /*
   * The column drill is still being tried out, so its sessions are not written down: they earn no
   * stars, move no streak and change no statistics until the shape of the drill is settled.
   */
  const isRecorded = (config: PracticeConfig) => RECORDED_KINDS.includes(config.kind);

  const handleProgress = async (progress: PracticeProgress) => {
    if (!run || !progress.finished || !isRecorded(run.config) || !subscribed) return;
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
        <PracticeConfigFields value={config} onChange={setConfig} kinds={kinds} />
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
      config={run.config}
      onProgress={handleProgress}
      summaryActions={
        <>
          {!isRecorded(run.config) && (
            <div className={styles.summaryNote}>Sinov rejimi — natija saqlanmaydi</div>
          )}
          {saved && <div className={styles.summaryNote}>Natija saqlandi ✓</div>}
          {!subscribed && <div className={styles.summaryNote}>Obuna tugagani uchun natija saqlanmadi.</div>}
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
