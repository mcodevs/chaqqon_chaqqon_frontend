import { type AnimationEvent, type CSSProperties, useId, useRef, useState } from 'react';
import { getTopic } from '@/domain/practice/topics';
import { Button } from '@/shared/ui/Button';
import { DigitCharacter } from '@/shared/ui/DigitCharacter';
import { useInView } from '../../motion/useInView';
import { usePrefersReducedMotion } from '../../motion/usePrefersReducedMotion';
import styles from './Vignettes.module.css';

/** Starts once this much of the picture is on screen, so the visitor sees it fill from the first dot. */
const PLAY_WHEN = { threshold: 0.4 } as const;

/** The sample homework's size: one dot per example. */
const EXAMPLES = 10;

/** A real topic from the curriculum, by its id; it drops out of the line if it is ever renamed away. */
const HEADER = ['Uy vazifasi', getTopic('kichik+4')?.label, `${EXAMPLES} ta misol`]
  .filter((part) => part !== undefined)
  .join(' · ');

/** The mascot standing in for the pupil: a real child's name never appears in a mock. */
const PUPIL_DIGIT = 6;

/**
 * "O'zi mashq qilgisi keladi": a homework solved without a mistake earns a star. Plays once when it
 * comes into view: the examples tick green one by one, then "Xatosiz! +1 ⭐" pops and the mascot
 * cheers. The words stay readable to a screen reader; the dots are decoration.
 */
export function HomeworkStars() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, PLAY_WHEN);
  const reduced = usePrefersReducedMotion();
  const headerId = useId();
  // Re-keys the picture, which restarts every animation in it.
  const [run, setRun] = useState(0);
  const [played, setPlayed] = useState(false);

  // Only the verdict's own pop counts, not the star glow bubbling up from inside it.
  const finish = (event: AnimationEvent<HTMLElement>) => {
    if (event.target === event.currentTarget) setPlayed(true);
  };

  return (
    <div ref={ref} className={styles.vignette}>
      <div
        className={styles.stage}
        data-kind="stars"
        data-play={seen ? 'go' : 'wait'}
        style={{ '--count': EXAMPLES } as CSSProperties}
      >
        <div key={run} className={styles.starsBody}>
          <p id={headerId} className={styles.starsHead}>
            {HEADER}
          </p>
          <ol className={styles.dots} aria-hidden="true">
            {Array.from({ length: EXAMPLES }, (_, index) => (
              <li key={index} className={styles.dot} style={{ '--dot': index } as CSSProperties}>
                <span className={styles.dotFill}>✓</span>
              </li>
            ))}
          </ol>
          <div className={styles.verdictRow}>
            <span className={styles.avatar} aria-hidden="true">
              <span className={styles.avatarHop}>
                <DigitCharacter digit={PUPIL_DIGIT} size={28} />
              </span>
            </span>
            <p className={styles.verdict} onAnimationEnd={finish}>
              Xatosiz! +1 <span className={styles.star}>⭐</span>
            </p>
          </div>
        </div>
      </div>

      <div className={styles.foot} data-replay={!reduced || undefined}>
        <span className={styles.namuna}>Namuna</span>
        {!reduced && (
          <span className={styles.replaySlot} data-ready={played || undefined}>
            <Button
              variant="ghost"
              tone="neutral"
              aria-describedby={headerId}
              onClick={() => setRun((n) => n + 1)}
            >
              <span className={styles.replayIcon} aria-hidden="true">
                ↻
              </span>
              Yana ko'rish
            </Button>
          </span>
        )}
      </div>
    </div>
  );
}
