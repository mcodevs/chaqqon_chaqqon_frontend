import { type CSSProperties, type ReactNode, type RefObject, useEffect, useId, useRef } from 'react';
import type { ProblemAttempt } from '@/domain/practice/session';
import { ColumnSum } from '@/features/practice/views/ColumnSum';
import { Button } from '@/shared/ui/Button';
import { DigitCharacter } from '@/shared/ui/DigitCharacter';
import motion from '../../motion/motion.module.css';
import { prefersReducedMotion } from '../../motion/usePrefersReducedMotion';
import { AbacusReplay } from './AbacusReplay';
import { demoSpeedLabel, fasterSpeed, slowerSpeed } from './demoConfig';
import styles from './DemoStage.module.css';

const MASCOT_SIZE = 44;
/** The answer's mascots land one after another, after the verdict's own pop has started. */
const MASCOT_START_MS = 120;
const MASCOT_STAGGER_MS = 100;

/**
 * The verdict, said in words. It renders inside the stage's live region (role="status"), which
 * exists from the round's start, so this is announced once, as it appears; the emoji is not read.
 */
export function DemoVerdict({ attempt }: { attempt: ProblemAttempt }) {
  if (attempt.isCorrect) {
    return (
      <span className={`${styles.banner} ${motion.pop}`} data-verdict="correct">
        To'g'ri! <span aria-hidden="true">🎉</span>
      </span>
    );
  }
  // A miss settles in quietly, with no red and no shake: overshoot is for celebrations only. The
  // no-break space keeps the dash closing the first line when the banner takes two.
  return (
    <span className={`${styles.banner} ${motion.rise}`} data-verdict="wrong">
      Bu safar chiqmadi{'\u00A0'}— to'g'ri javob: {attempt.problem.answer}
    </span>
  );
}

interface DemoFeedbackProps {
  attempt: ProblemAttempt;
  /** The speed the next round will use: "Tezroq" and "Sekinroq" step from it. */
  speed: number;
  /** Correct answers in a row, this one included. */
  streak: number;
  stageRef: RefObject<HTMLElement | null>;
  /**
   * The stage's verdict paragraph. Focus lands on "Yana bir raund" just as the verdict is announced,
   * which often cuts that announcement off, so the button carries the verdict as its description.
   */
  verdictId: string;
  replayOpen: boolean;
  onReplayOpenChange: (open: boolean) => void;
  /** Sets the speed and starts the next round straight away. */
  onSpeedRound: (speed: number) => void;
  onAgain: () => void;
  /** Daraja and Tezlik, from the first round on: they sit right above "Yana bir raund". */
  children?: ReactNode;
}

/**
 * What a finished round leaves on the stage, under the verdict: the answer's mascots on a correct
 * answer, the written column on a miss, a one-tap speed change, the abacus replay, and the stage's
 * one primary action, "Yana bir raund", which takes the keyboard once so Enter plays again.
 */
export function DemoFeedback({
  attempt,
  speed,
  streak,
  stageRef,
  verdictId,
  replayOpen,
  onReplayOpenChange,
  onSpeedRound,
  onAgain,
  children,
}: DemoFeedbackProps) {
  const replayId = useId();
  const againRef = useRef<HTMLButtonElement>(null);
  const replayToggle = useRef<HTMLButtonElement>(null);
  const { problem, answer, isCorrect } = attempt;
  // Right answers invite a faster round, misses a slower one; neither shows past the end of the range.
  const nextSpeed = isCorrect ? fasterSpeed(speed) : slowerSpeed(speed);
  const digits = digitsOf(problem.answer);

  // Once per result (the ref is stable). A frame later, so the Enter that sent the answer has had its
  // keypress, which is what presses a focused button, before focus lands on "Yana bir raund".
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stage = stageRef.current;
      if (stage) {
        // The verdict sits at the stage's top. Lift the stage to just under the header only when
        // that top is hidden or the grown result runs off the screen; otherwise the page stays put.
        const box = stage.getBoundingClientRect();
        // The page's scroll-padding (the header) plus the stage's own margin (the mascots).
        const clearance =
          (Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0) +
          (Number.parseFloat(getComputedStyle(stage).scrollMarginTop) || 0);
        if (box.top < clearance || box.bottom > window.innerHeight) {
          stage.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
        }
      }
      againRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [stageRef]);

  const closeReplay = () => {
    onReplayOpenChange(false);
    // "Yopish" disappears with the replay: the keyboard goes back to the button that opened it.
    replayToggle.current?.focus();
  };

  return (
    <div className={styles.feedback}>
      {isCorrect ? (
        <div className={styles.cheer}>
          <span className={styles.mascots} aria-hidden="true">
            {digits.map((digit, index) => (
              <span
                key={index}
                className={`${styles.mascot} ${motion.pop}`}
                style={delay(MASCOT_START_MS + index * MASCOT_STAGGER_MS)}
              >
                <DigitCharacter digit={digit} size={MASCOT_SIZE} />
              </span>
            ))}
          </span>
          {streak >= 2 && (
            <span
              className={`${styles.streak} ${motion.pop}`}
              style={delay(MASCOT_START_MS + digits.length * MASCOT_STAGGER_MS)}
            >
              Ketma-ket {streak} ta to'g'ri <span aria-hidden="true">🔥</span>
            </span>
          )}
        </div>
      ) : (
        <div className={`${styles.review} ${motion.rise}`}>
          {/* It prints "Sizning javobingiz: …" under the right total itself. */}
          <ColumnSum problem={problem} userAnswer={answer} />
        </div>
      )}

      <div className={styles.actions}>
        {nextSpeed !== null && (
          <Button
            variant="ghost"
            tone="neutral"
            size="sm"
            className={styles.action}
            onClick={() => onSpeedRound(nextSpeed)}
          >
            {isCorrect ? 'Tezroq' : 'Sekinroq'} — {demoSpeedLabel(nextSpeed)}
          </Button>
        )}
        <Button
          ref={replayToggle}
          variant="ghost"
          tone="neutral"
          size="sm"
          className={styles.action}
          aria-expanded={replayOpen}
          aria-controls={replayOpen ? replayId : undefined}
          onClick={() => onReplayOpenChange(!replayOpen)}
        >
          <span aria-hidden="true">🧮</span> Abakusda ko'rish
        </Button>
      </div>

      {replayOpen && <AbacusReplay id={replayId} problem={problem} onClose={closeReplay} />}

      <div className={styles.next}>
        {children}
        <Button ref={againRef} size="lg" block aria-describedby={verdictId} onClick={onAgain}>
          Yana bir raund
        </Button>
      </div>
    </div>
  );
}

/** 27 → [2, 7]: one mascot per digit of the answer. */
function digitsOf(value: number): number[] {
  return Array.from(String(Math.abs(value)), Number);
}

/** The shared stagger every motion class reads. */
function delay(ms: number): CSSProperties {
  return { '--lp-delay': `${ms}ms` } as CSSProperties;
}
