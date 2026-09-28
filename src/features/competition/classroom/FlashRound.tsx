import { useRef } from 'react';
import type { PracticeConfig } from '@/domain/practice/config';
import { sorobanRods } from '@/domain/practice/drills';
import { type SessionState, countCorrect, currentProblem, lastAttempt } from '@/domain/practice/session';
import type { Student } from '@/domain/users';
import { useKeepFocus } from '@/shared/hooks/useKeepFocus';
import { FlashDigits } from '@/features/practice/views/FlashDigits';
import { FlashSoroban } from '@/features/practice/views/FlashSoroban';
import { Button } from '@/shared/ui/Button';
import styles from './Classroom.module.css';
import { LanePanel } from './LanePanel';

interface FlashRoundProps {
  /** In the ready, showing, gap or feedback phase. */
  state: SessionState;
  config: PracticeConfig;
  participants: readonly Student[];
  isLastRound: boolean;
  onNext: () => void;
}

/** Numbers flashing in every panel at once, then each panel's verdict. */
export function FlashRound({ state, config, participants, isLastRound, onNext }: FlashRoundProps) {
  const { phase } = state;
  const isCard = config.kind === 'soroban';
  const nextButton = useRef<HTMLButtonElement>(null);

  // Only the verdict waits for a keypress; while numbers flash there is nothing to press.
  useKeepFocus(() => (phase === 'feedback' ? nextButton.current : null));

  return (
    <>
      <div className={styles.grid} data-lanes={participants.length}>
        {participants.map((student, lane) => {
          const attempt = phase === 'feedback' ? lastAttempt(state, lane) : undefined;
          return (
            <LanePanel
              key={student.id}
              name={student.firstName}
              avatarUrl={student.avatarUrl}
              correct={countCorrect(state, lane)}
              verdict={attempt ? (attempt.isCorrect ? 'good' : 'bad') : undefined}
            >
              {attempt ? (
                <>
                  <div className={styles.verdict}>{attempt.isCorrect ? "To'g'ri" : "Noto'g'ri"}</div>
                  <div className={styles.correctAnswer}>{attempt.problem.answer}</div>
                  {!attempt.isCorrect && (
                    <div className={styles.givenAnswer}>Aytilgan javob: {attempt.answer ?? '—'}</div>
                  )}
                </>
              ) : phase === 'ready' || phase === 'showing' || phase === 'gap' ? (
                isCard ? (
                  <FlashSoroban
                    phase={phase}
                    value={currentProblem(state, lane).numbers[state.numberIndex]}
                    rods={sorobanRods(config.digitCount)}
                    announce={false}
                    className={styles.laneSoroban}
                  />
                ) : (
                  <FlashDigits
                    phase={phase}
                    value={currentProblem(state, lane).numbers[state.numberIndex]}
                    isFirst={state.numberIndex === 0}
                    announce={false}
                    className={styles.laneDigits}
                  />
                )
              ) : null}
            </LanePanel>
          );
        })}
      </div>
      {/*
        No timer bar here: on the projector it sits right under the numbers and pulls the class's
        eyes off them. The footer keeps its height so the lanes do not jump between phases.
      */}
      <footer className={styles.controls}>
        {phase === 'feedback' && (
          <Button ref={nextButton} autoFocus onClick={onNext}>
            {isLastRound ? 'Natijalar' : isCard ? 'Keyingi karta' : 'Keyingi misol'}
          </Button>
        )}
      </footer>
    </>
  );
}
