import {
  type SessionState,
  countCorrect,
  currentProblem,
  lastAttempt,
  numberTiming,
} from '@/domain/practice/session';
import type { Student } from '@/domain/users';
import { FlashDigits } from '@/features/practice/views/FlashDigits';
import { TimerBar } from '@/features/practice/views/TimerBar';
import { Button } from '@/shared/ui/Button';
import styles from './Classroom.module.css';
import { LanePanel } from './LanePanel';

interface FlashRoundProps {
  /** In the ready, showing, gap or feedback phase. */
  state: SessionState;
  participants: readonly Student[];
  secondsPerNumber: number;
  isLastRound: boolean;
  onNext: () => void;
}

/** Numbers flashing in every panel at once, then each panel's verdict. */
export function FlashRound({ state, participants, secondsPerNumber, isLastRound, onNext }: FlashRoundProps) {
  const { phase } = state;

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
                <FlashDigits
                  phase={phase}
                  value={currentProblem(state, lane).numbers[state.numberIndex]}
                  isFirst={state.numberIndex === 0}
                  announce={false}
                  className={styles.laneDigits}
                />
              ) : null}
            </LanePanel>
          );
        })}
      </div>
      <footer className={styles.controls}>
        {phase === 'feedback' ? (
          <Button tone="blue" autoFocus onClick={onNext}>
            {isLastRound ? 'Natijalar' : 'Keyingi misol'}
          </Button>
        ) : (
          <TimerBar
            running={phase === 'showing'}
            durationMs={numberTiming(secondsPerNumber).showMs}
            restartKey={`${state.round}-${state.numberIndex}`}
          />
        )}
      </footer>
    </>
  );
}
