import { useEffect, useMemo, useRef, useState } from 'react';
import { problemFrames, signedText } from '@/domain/practice/abacus';
import type { Problem } from '@/domain/practice/problem';
import { Button } from '@/shared/ui/Button';
import { Soroban } from '@/shared/ui/Soroban';
import landing from '../../Landing.module.css';
import motion from '../../motion/motion.module.css';
import { prefersReducedMotion, usePrefersReducedMotion } from '../../motion/usePrefersReducedMotion';
import { DEMO_RODS } from './demoConfig';
import styles from './DemoStage.module.css';

/** One bead movement a second: slow enough to follow each formula with the eye. */
const REPLAY_STEP_MS = 1000;

interface AbacusReplayProps {
  /** For the opening button's aria-controls. */
  id: string;
  problem: Problem;
  onClose: () => void;
}

/**
 * The round just played, worked on a read-only three-rod soroban: one frame per bead movement,
 * with the formula each one uses, ending on the answer. It plays through once by itself (never
 * under reduced motion) and hands the steps to the visitor the moment their hand or keyboard
 * arrives inside it; "Keyingi qadam" is always there for stepping by hand.
 */
export function AbacusReplay({ id, problem, onClose }: AbacusReplayProps) {
  const box = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();
  const frames = useMemo(() => problemFrames(problem.numbers, DEMO_RODS), [problem]);
  const last = frames.length - 1;
  const [index, setIndex] = useState(0);
  // True while the show runs by itself; false for good once the visitor takes over.
  const [auto, setAuto] = useState(true);

  const frame = frames[Math.min(index, last)];
  const atEnd = index >= last;
  const running = auto && !reduced && !atEnd;
  // Steps are announced only when the visitor drives them; a show narrating itself would talk over them.
  const live = !auto || reduced;

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setIndex((current) => current + 1), REPLAY_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [running, index]);

  // It opens under the verdict, possibly below the fold: bring it into view, as little as needed.
  useEffect(() => {
    box.current?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, []);

  const takeOver = () => setAuto(false);

  const next = () => {
    setAuto(false);
    if (!atEnd) setIndex(index + 1);
  };

  return (
    // pointerup, not pointerdown: a finger that lands here only to scroll the page ends in
    // pointercancel, so scrolling past the replay does not stop it.
    <div
      ref={box}
      id={id}
      className={`${styles.replay} ${motion.rise}`}
      onPointerUp={takeOver}
      onFocus={takeOver}
    >
      <div className={styles.moves} aria-hidden="true">
        {problem.numbers.map((value, row) => (
          <span
            key={row}
            className={styles.move}
            data-state={row === frame.row ? 'current' : row < frame.row ? 'done' : undefined}
          >
            {row === 0 ? value : signedText(value)}
          </span>
        ))}
      </div>

      <Soroban value={frame.value} rods={DEMO_RODS} size="md" highlight={frame.column} label="Abakus" />

      <div className={styles.replayCaption} aria-live={live ? 'polite' : undefined} aria-atomic="true">
        <p className={styles.stepCount}>
          Qadam {Math.min(index, last) + 1} / {frames.length}
        </p>
        <p className={styles.stepHeader}>{frame.header}</p>
        {/* Held open when a step has no formula, so the text and buttons below never jump. */}
        <div className={styles.formulaSlot}>
          {frame.formula && (
            <span key={index} className={`${styles.formula} ${motion.flashIn}`}>
              {frame.formula}
            </span>
          )}
        </div>
        <p key={index} className={`${styles.stepText} ${motion.rise}`}>
          {frame.text}
        </p>
      </div>

      <ol className={landing.visuallyHidden} aria-label="Qadamlar">
        {frames.map((step, position) => (
          <li key={position}>{[step.header, step.formula, step.text].filter(Boolean).join('. ')}</li>
        ))}
      </ol>

      <div className={styles.replayActions}>
        {/* aria-disabled, not disabled: a disabled button would drop the keyboard's focus at the end. */}
        <Button variant="secondary" aria-disabled={atEnd || undefined} onClick={next}>
          Keyingi qadam
        </Button>
        <Button variant="ghost" tone="neutral" onClick={onClose}>
          Yopish
        </Button>
      </div>
    </div>
  );
}
