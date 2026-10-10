import { type CSSProperties, type RefObject, useLayoutEffect, useRef, useState } from 'react';
import landing from '../Landing.module.css';
import { type Step, steps } from '../content/landingCopy';
import { Reveal } from '../motion/Reveal';
import { supportsInView, watchInView } from '../motion/useInView';
import motion from '../motion/motion.module.css';
import styles from './Steps.module.css';

/* Reveal's own watch, so a step's line starts drawing as the step itself starts to rise. */
const DRAW_WATCH = { threshold: 0, rootMargin: '0px 0px -8% 0px' } as const;

/**
 * Where a step's line (and the trial's 🎁) stands: 'still' is simply there (on screen at first
 * paint, no IntersectionObserver, motion off), 'wait' hides it below the fold until the step is
 * reached, 'draw' plays it once.
 */
type DrawPhase = 'still' | 'wait' | 'draw';

export interface StepsProps {
  /** The admin's free trial; 0 turns step 3 into "add your students" with no gift. */
  trialDays: number;
}

/**
 * "Qanday boshlanadi" (#boshlash): from the application to the first lesson in three steps. The
 * discs are neutral numbers; colour goes only to the free-trial step, and only while a trial is
 * offered, so the page never promises one the admin has switched off.
 */
export function Steps({ trialDays }: StepsProps) {
  const items = steps(trialDays);

  return (
    <section id="boshlash" aria-labelledby="boshlash-title" className={landing.section}>
      <div className={landing.sectionHead}>
        <h2 id="boshlash-title" className={landing.sectionTitle}>
          Qanday boshlanadi
        </h2>
      </div>

      <ol className={styles.list}>
        {items.map((step, index) => (
          // By position: step 3 changes its words when the trial setting arrives, not its place.
          <StepItem key={index} step={step} index={index} last={index === items.length - 1} />
        ))}
      </ol>
    </section>
  );
}

/**
 * One step: its disc, the line on to the next disc (down on a phone, across on a wide screen; both
 * are drawn and CSS shows one) and its card.
 */
function StepItem({ step, index, last }: { step: Step; index: number; last: boolean }) {
  const disc = useRef<HTMLSpanElement>(null);
  const phase = useDrawPhase(disc);
  const drawing = phase === 'draw';

  return (
    <Reveal
      as="li"
      index={index}
      className={styles.step}
      data-draw={phase}
      style={{ '--step': index } as CSSProperties}
    >
      <span ref={disc} className={styles.disc}>
        {index + 1}
      </span>

      {!last && (
        <>
          <span className={drawing ? `${styles.lineY} ${motion.drawY}` : styles.lineY} aria-hidden="true" />
          <span className={drawing ? `${styles.lineX} ${motion.drawX}` : styles.lineX} aria-hidden="true" />
        </>
      )}

      <div className={styles.card} data-trial={step.trial || undefined}>
        {step.trial && (
          // The sticker tilts on the outer span; the pop scales the inner one, so neither undoes the other.
          <span className={styles.gift} aria-hidden="true">
            <span className={drawing ? `${styles.giftFace} ${motion.pop}` : styles.giftFace}>🎁</span>
          </span>
        )}
        <h3 className={styles.title}>{step.title}</h3>
        <p className={styles.text}>{step.text}</p>
      </div>
    </Reveal>
  );
}

/**
 * Draws a step's line once, when its disc comes into view. Only a step that starts below the fold
 * waits hidden, like Reveal's content: one already on screen never blinks out to draw again.
 */
function useDrawPhase(ref: RefObject<HTMLElement | null>): DrawPhase {
  const [phase, setPhase] = useState<DrawPhase>('still');

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !supportsInView()) return;
    if (element.getBoundingClientRect().top <= window.innerHeight) return;

    // Before paint, so the line is hidden from its first frame (CSS hides it only with motion on).
    setPhase('wait');
    return watchInView(
      element,
      (entry, stop) => {
        if (!entry.isIntersecting) return;
        stop();
        // Without the landing's motion gate (an #ariza arrival, reduced motion) the line was never
        // hidden, so it stays as it is instead of vanishing to redraw.
        setPhase(element.closest("[data-landing-motion='on']") ? 'draw' : 'still');
      },
      DRAW_WATCH,
    );
  }, [ref]);

  return phase;
}
