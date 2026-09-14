import { useState } from 'react';
import type { LaneScore } from '@/domain/classroom';
import { countCorrect, roundCount } from '@/domain/practice/session';
import { useFlashSession } from '@/features/practice/useFlashSession';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useFullscreen } from '@/shared/hooks/useFullscreen';
import { useServices } from '@/shared/services/ServicesContext';
import { Button } from '@/shared/ui/Button';
import { AnswerRound } from './AnswerRound';
import styles from './Classroom.module.css';
import { ClassroomResults } from './ClassroomResults';
import { FlashRound } from './FlashRound';
import type { ClassroomMatchSetup } from './types';

interface ClassroomMatchProps {
  setup: ClassroomMatchSetup;
  onRematch: () => void;
  onClose: () => void;
}

/**
 * Full-window split screen. Every panel flashes its own numbers in step with the others;
 * the teacher enters the answers and decides when the next round starts.
 */
export function ClassroomMatch({ setup, onRematch, onClose }: ClassroomMatchProps) {
  const { config, participants, problemSets } = setup;
  const { results } = useServices();
  const fullscreen = useFullscreen();
  const { state, submitAnswers, next } = useFlashSession({
    problemSets,
    secondsPerNumber: config.secondsPerNumber,
    autoAdvance: false,
  });
  const saveMatch = useAsyncAction(results.recordClassroomMatch);
  const [saved, setSaved] = useState(false);

  const rounds = roundCount(state);
  const isLastRound = state.round >= rounds - 1;
  const correctSoFar = participants.map((_, lane) => countCorrect(state, lane));
  const scores: LaneScore[] = participants.map((student, lane) => ({
    studentId: student.id,
    correct: correctSoFar[lane],
    total: rounds,
  }));

  const save = async () => {
    const recorded = await saveMatch.run({ config, scores });
    setSaved(recorded !== undefined);
  };

  const handleNext = () => {
    // The last verdicts are shown, so the scores are final.
    if (isLastRound) void save();
    next();
  };

  const close = () => {
    void fullscreen.exit();
    onClose();
  };

  const stop = () => {
    if (state.phase === 'finished' || window.confirm("Musobaqani to'xtatasizmi? Natijalar saqlanmaydi.")) {
      close();
    }
  };

  const progress =
    state.phase === 'finished'
      ? 'Yakunlandi'
      : state.phase === 'showing' || state.phase === 'gap'
        ? `Misol ${state.round + 1}/${rounds} · ${state.numberIndex + 1}/${config.rowCount}`
        : `Misol ${state.round + 1}/${rounds}`;

  return (
    <div className={styles.match} role="dialog" aria-modal="true" aria-label="Sinf musobaqasi">
      <header className={styles.matchHeader}>
        <div className={styles.matchTitle}>
          Sinf musobaqasi <span className={styles.matchProgress}>{progress}</span>
        </div>
        <div className={styles.matchActions}>
          {fullscreen.supported && (
            <Button
              size="sm"
              variant="outline"
              onClick={fullscreen.active ? fullscreen.exit : fullscreen.enter}
            >
              {fullscreen.active ? "To'liq ekrandan chiqish" : "To'liq ekran"}
            </Button>
          )}
          <Button size="sm" variant="soft" tone="coral" onClick={stop}>
            {state.phase === 'finished' ? 'Yopish' : "To'xtatish"}
          </Button>
        </div>
      </header>

      {state.phase === 'finished' ? (
        <ClassroomResults
          participants={participants}
          scores={scores}
          save={{ pending: saveMatch.pending, saved, error: saveMatch.error }}
          onRetrySave={() => void save()}
          onRematch={onRematch}
          onClose={close}
        />
      ) : state.phase === 'answering' ? (
        <AnswerRound
          key={state.round}
          participants={participants}
          correctSoFar={correctSoFar}
          onSubmit={submitAnswers}
        />
      ) : (
        <FlashRound
          state={state}
          participants={participants}
          secondsPerNumber={config.secondsPerNumber}
          isLastRound={isLastRound}
          onNext={handleNext}
        />
      )}
    </div>
  );
}
