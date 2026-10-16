import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { DuelProgress, DuelSnapshot } from '@/application/duelService';
import { DEFAULT_PRACTICE_CONFIG, isFlashed } from '@/domain/practice/config';
import { countCorrect, currentProblem, lastAttempt } from '@/domain/practice/session';
import type { Student } from '@/domain/users';
import { useFlashSession } from '@/features/practice/useFlashSession';
import { AnswerView } from '@/features/practice/views/AnswerView';
import { FlashView } from '@/features/practice/views/FlashView';
import { ErrorMessage } from '@/shared/ui/Notice';
import styles from './Duel.module.css';
import { DuelHostControls } from './DuelHostControls';

interface DuelRunProps {
  snapshot: DuelSnapshot;
  students: readonly Student[];
  me: Student;
  pending: boolean;
  error: string | null;
  onNext: () => void;
  onStop: () => void;
  onProgress: (progress: DuelProgress) => void;
}

/** Three, two, one — then the first problem. Only the very start of a duel is counted in. */
export function DuelRun(props: DuelRunProps) {
  const { snapshot, me } = props;
  const played = snapshot.participants.find((participant) => participant.studentId === me.id)?.answered ?? 0;
  const [count, setCount] = useState(() => (snapshot.duel.round === 0 && played === 0 ? 3 : 0));

  useEffect(() => {
    if (count <= 0) return;
    const timer = window.setTimeout(() => setCount((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [count]);

  if (count > 0) {
    return (
      <div className={styles.countdownStage}>
        <div className={styles.countdownLabel}>Bellashuv boshlanadi…</div>
        <div key={count} className={styles.countdownNumber}>
          {count}
        </div>
      </div>
    );
  }

  return <DuelLane {...props} />;
}

/**
 * This player's own problems. Every device runs its own lane and they stay in step because the
 * round only moves when the host says so: when it does, a lane that has not answered yet counts
 * the round as missed and moves on with everyone else.
 */
function DuelLane({ snapshot, students, me, pending, error, onNext, onStop, onProgress }: DuelRunProps) {
  const { duel, participants } = snapshot;
  const config = duel.configs[me.id] ?? DEFAULT_PRACTICE_CONFIG;
  const problems = duel.problems[me.id] ?? [];
  const isHost = duel.hostId === me.id;

  const { state, submitAnswers, skip, next } = useFlashSession({
    problemSets: [problems],
    secondsPerNumber: config.secondsPerNumber,
    autoAdvance: false,
    flashed: isFlashed(config.kind),
    // Reopened mid-duel: the rounds already over are missed, not replayed.
    startRound: Math.min(duel.round, Math.max(problems.length - 1, 0)),
  });

  /** What this player had already recorded before this screen opened; new answers add to it. */
  const [recorded] = useState(() => {
    const mine = participants.find((participant) => participant.studentId === me.id);
    return { correct: mine?.correct ?? 0, answerMs: mine?.answerMs ?? 0 };
  });
  const answerStartedAt = useRef<number | null>(null);
  const spentMs = useRef(0);
  const onProgressRef = useRef(onProgress);

  useLayoutEffect(() => {
    onProgressRef.current = onProgress;
  });

  const answered = state.lanes[0].attempts.length;
  const correct = countCorrect(state);

  useEffect(() => {
    if (state.phase === 'answering') answerStartedAt.current = performance.now();
  }, [state.phase, state.round]);

  // Every answer is reported at once, so the host's list ticks over as they land.
  useEffect(() => {
    if (answered === 0) return;
    onProgressRef.current({
      answered,
      correct: recorded.correct + correct,
      answerMs: recorded.answerMs + spentMs.current,
    });
  }, [answered, correct, recorded]);

  // The host moved everyone on.
  useEffect(() => {
    if (duel.round <= state.round) return;
    if (state.phase !== 'feedback') skip();
    next();
  }, [duel.round, state.round, state.phase, skip, next]);

  const submit = (answer: number) => {
    if (answerStartedAt.current !== null) {
      spentMs.current += Math.round(performance.now() - answerStartedAt.current);
      answerStartedAt.current = null;
    }
    submitAnswers([answer]);
  };

  const isLastRound = duel.round >= duel.roundCount - 1;
  const attempt = lastAttempt(state);
  const position = { problemNumber: state.round + 1, problemCount: duel.roundCount };

  return (
    <div className={styles.run}>
      {state.phase === 'answering' ? (
        <AnswerView
          key={state.round}
          kind={config.kind}
          {...position}
          problem={currentProblem(state)}
          onSubmit={submit}
        />
      ) : state.phase === 'feedback' || state.phase === 'finished' ? (
        <div className={styles.stage}>
          {attempt && (
            <>
              <div
                role="status"
                className={`${styles.verdict} ${attempt.isCorrect ? styles.good : styles.bad}`}
              >
                {attempt.isCorrect ? "To'g'ri! 🎉" : attempt.answer === null ? 'Ulgurmadingiz' : "Noto'g'ri"}
              </div>
              <div className={styles.verdictAnswer}>To'g'ri javob: {attempt.problem.answer}</div>
            </>
          )}
          <div className={styles.ownScore}>Sizda: {recorded.correct + correct} ta to'g'ri</div>
          {!isHost && (
            <p className={styles.waiting} role="status">
              Keyingisini boshlovchi boshlaydi…
            </p>
          )}
        </div>
      ) : (
        <FlashView
          config={config}
          {...position}
          phase={state.phase}
          numbers={currentProblem(state).numbers}
          numberIndex={state.numberIndex}
        />
      )}

      <ErrorMessage>{error}</ErrorMessage>

      {isHost && state.phase !== 'ready' && state.phase !== 'showing' && state.phase !== 'gap' && (
        <DuelHostControls
          duel={duel}
          participants={participants}
          students={students}
          isLastRound={isLastRound}
          pending={pending}
          onNext={onNext}
          onStop={onStop}
        />
      )}
    </div>
  );
}
