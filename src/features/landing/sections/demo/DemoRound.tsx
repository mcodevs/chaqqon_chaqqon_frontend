import { type RefObject, useEffect, useRef } from 'react';
import type { Problem } from '@/domain/practice/problem';
import { type ProblemAttempt, lastAttempt } from '@/domain/practice/session';
import { useFlashSession } from '@/features/practice/useFlashSession';
import { FlashDigits } from '@/features/practice/views/FlashDigits';
import { Button } from '@/shared/ui/Button';
import motion from '../../motion/motion.module.css';
import { DemoAnswer } from './DemoAnswer';
import styles from './DemoStage.module.css';

interface DemoRoundProps {
  problem: Problem;
  /** Seconds from one number to the next. */
  speed: number;
  /** The stage, centred on screen once the answer is asked for. */
  stageRef: RefObject<HTMLElement | null>;
  onDone: (attempt: ProblemAttempt) => void;
  /** "Qaytadan ko'rsatish": the same numbers once more; it does not count as a round. */
  onShowAgain: () => void;
  onStop: () => void;
}

/**
 * One round, start to answer, on the real practice session: the timings, the "Tayyor turing…"
 * pause and the flashed digits are exactly what a student gets. The session has no pause, so the
 * stage re-keys this component to restart it.
 *
 * Renders two pieces of the stage card, the top row (progress and the stop button) and a body
 * layer, each into its own grid area, so the body sits over the hidden idle layer and keeps its height.
 */
export function DemoRound({ problem, speed, stageRef, onDone, onShowAgain, onStop }: DemoRoundProps) {
  const { state, submitAnswers } = useFlashSession({
    problemSets: [[problem]],
    secondsPerNumber: speed,
    autoAdvance: false,
  });
  const flash = useRef<HTMLDivElement>(null);
  const reported = useRef(false);
  const { phase, numberIndex } = state;
  const count = problem.numbers.length;

  // The visitor pressed a button for this: the numbers are where their attention, and focus, goes.
  useEffect(() => {
    flash.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const attempt = lastAttempt(state);
    if (state.phase !== 'feedback' || !attempt || reported.current) return;
    reported.current = true;
    onDone(attempt);
  }, [state, onDone]);

  // Escape stops the round from anywhere on the page, the answer field included.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented && !event.isComposing) onStop();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onStop]);

  const flashing = phase === 'ready' || phase === 'showing' || phase === 'gap';
  const shown = phase === 'ready' ? 0 : flashing ? numberIndex + 1 : count;

  return (
    <>
      <div className={styles.top}>
        <div className={styles.progress}>
          <span className={styles.count}>
            {shown}/{count}
          </span>
          <span className={styles.dots} aria-hidden="true">
            {problem.numbers.map((_, index) => (
              <span key={index} className={styles.dot} data-on={index < shown || undefined} />
            ))}
          </span>
        </div>
        <Button
          variant="ghost"
          tone="neutral"
          size="sm"
          className={styles.stop}
          aria-keyshortcuts="Escape"
          onClick={onStop}
        >
          To'xtatish
        </Button>
      </div>

      <div className={styles.layer}>
        {flashing ? (
          <div ref={flash} className={styles.flash} tabIndex={-1} role="group" aria-label="Sonlar">
            {/*
             * One live region for the whole round, kept mounted so every number is announced (a
             * region re-created per number often is not). flashIn comes off in the blank between
             * numbers and back on with the next, which replays it.
             */}
            <FlashDigits
              phase={phase}
              value={problem.numbers[numberIndex]}
              isFirst={numberIndex === 0}
              announce
              className={phase === 'showing' ? motion.flashIn : undefined}
            />
          </div>
        ) : (
          <DemoAnswer
            stageRef={stageRef}
            onSubmit={(answer) => submitAnswers([answer])}
            onShowAgain={onShowAgain}
          />
        )}
      </div>
    </>
  );
}
