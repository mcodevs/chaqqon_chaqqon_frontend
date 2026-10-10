import { type CSSProperties, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { TopicGroupId } from '@/domain/practice/topics';
import { Button } from '@/shared/ui/Button';
import { Soroban } from '@/shared/ui/Soroban';
import landing from '../../Landing.module.css';
import { Reveal } from '../../motion/Reveal';
import motion from '../../motion/motion.module.css';
import { isInView, watchInView } from '../../motion/useInView';
import { prefersReducedMotion, usePrefersReducedMotion } from '../../motion/usePrefersReducedMotion';
import styles from '../AbacusSection.module.css';
import {
  AUTOPLAY_STEP_MS,
  CURRICULUM_RODS,
  DEFAULT_MILESTONE,
  MILESTONES,
  RAIL_TITLE,
  frameSummary,
  milestoneAriaLabel,
  milestoneFrames,
  milestoneOf,
} from './curriculum';

/** The default example plays by itself once, when this much of the player is first on screen. */
const FIRST_VIEW = { threshold: 0.4 } as const;

/**
 * "Formulalar": the curriculum rail drives a read-only abacus. Picking a milestone plays its
 * example once, a bead move every 1.2 s, and stops on the sum; the default milestone does the same
 * the first time the player comes into view. Nothing loops, nothing plays under reduced motion, and
 * the visitor's hand always wins: a tap or focus inside the player hands the steps over to them.
 *
 * Renders two grid items, the player and the rail, so the section can put them in separate places
 * (the player in its own column on a desktop). `hidden` keeps the selection while the other mode
 * is on show.
 */
export function CurriculumPlayer({ hidden = false }: { hidden?: boolean }) {
  const railTitleId = useId();
  const cardId = useId();
  const slot = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  const [milestoneId, setMilestoneId] = useState<TopicGroupId>(DEFAULT_MILESTONE);
  const [index, setIndex] = useState(0);
  // 0 while the visitor steps; otherwise the id of the running show, so a restart re-arms the timer.
  const [run, setRun] = useState(0);
  const runs = useRef(0);
  // Set once the visitor has picked or touched anything: the first-view show must not start under them.
  const touched = useRef(false);

  const milestone = milestoneOf(milestoneId);
  const frames = useMemo(() => milestoneFrames(milestoneId), [milestoneId]);
  const last = frames.length - 1;
  const frame = frames[Math.min(index, last)];
  const atEnd = index >= last;
  const running = run !== 0 && !reduced && !hidden && !atEnd;
  // Steps are announced only when the visitor drives them; a show narrating itself would talk over them.
  const live = run === 0 || reduced;

  const play = () => setRun(prefersReducedMotion() ? 0 : ++runs.current);
  const takeOver = () => {
    touched.current = true;
    setRun(0);
  };

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setIndex((current) => current + 1), AUTOPLAY_STEP_MS);
    return () => window.clearTimeout(timer);
  }, [running, index, run]);

  useEffect(() => {
    const element = slot.current;
    if (!element) return;
    return watchInView(
      element,
      (entry, stop) => {
        if (!isInView(entry, FIRST_VIEW.threshold)) return;
        stop();
        if (!touched.current && !prefersReducedMotion()) setRun(++runs.current);
      },
      FIRST_VIEW,
    );
  }, []);

  const select = (id: TopicGroupId) => {
    touched.current = true;
    setMilestoneId(id);
    setIndex(0);
    play();
    // On a phone the player sits above the rail; on a desktop it is already in view and stays put.
    slot.current?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  const next = () => {
    setRun(0);
    if (!atEnd) setIndex(index + 1);
  };

  // The visitor pressed it, and their focus is in the player: they step from here, with the caption live.
  const restart = () => {
    touched.current = true;
    setIndex(0);
    setRun(0);
  };

  return (
    <>
      {/*
       * pointerup, not pointerdown: a finger that lands here only to scroll the page ends in
       * pointercancel, so scrolling past the player does not stop its show.
       */}
      <div
        ref={slot}
        className={`${styles.slot} ${motion.rise}`}
        hidden={hidden}
        onPointerUp={takeOver}
        onFocus={takeOver}
      >
        <Reveal
          className={`${styles.stage} ${styles.player}`}
          style={{ '--accent': milestone.color } as CSSProperties}
        >
          <div className={styles.stageTop}>
            <span className={styles.tag}>
              <span className={styles.tagDot} aria-hidden="true" />
              {milestone.label}
            </span>
            <span className={styles.segments} aria-hidden="true">
              {frames.map((_, step) => (
                <span key={step} className={styles.segment} data-done={step <= index || undefined} />
              ))}
            </span>
          </div>

          <div className={`${styles.abacus} ${styles.playerAbacus}`}>
            <Soroban
              value={frame.value}
              rods={CURRICULUM_RODS}
              size="lg"
              highlight={frame.column}
              label="Formula abakusi"
            />
          </div>

          <div className={styles.caption} aria-live={live ? 'polite' : undefined} aria-atomic="true">
            <p className={styles.counter}>
              Qadam {index + 1} / {frames.length}
            </p>
            <p className={styles.expression}>{frame.header}</p>
            <div className={styles.formulaSlot}>
              {frame.formula && (
                <span key={`${milestoneId}-${index}`} className={`${styles.formula} ${motion.flashIn}`}>
                  {frame.formula}
                </span>
              )}
            </div>
            <p key={`${milestoneId}-${index}`} className={`${styles.stepText} ${motion.rise}`}>
              {frame.text}
            </p>
          </div>

          <ol className={landing.visuallyHidden} aria-label="Qadamlar">
            {frames.map((step, position) => (
              <li key={position}>{frameSummary(step)}</li>
            ))}
          </ol>

          <div className={styles.controls}>
            {/* aria-disabled, not disabled: a disabled button would drop the keyboard's focus at the end. */}
            <Button variant="secondary" aria-disabled={atEnd || undefined} onClick={next}>
              Keyingi qadam
            </Button>
            <Button variant="ghost" tone="neutral" onClick={restart}>
              Boshidan
            </Button>
          </div>
        </Reveal>
      </div>

      <div className={styles.rail} hidden={hidden}>
        <h3 id={railTitleId} className={styles.railTitle}>
          {RAIL_TITLE}
        </h3>
        <ol className={styles.milestones} aria-labelledby={railTitleId}>
          {MILESTONES.map((item, position) => {
            // aria-label replaces the content, so the hint and topic count come back as a description.
            const hintId = `${cardId}-${item.id}-hint`;
            const countId = `${cardId}-${item.id}-count`;
            return (
              <Reveal as="li" key={item.id} index={position} className={styles.milestoneItem}>
                <button
                  type="button"
                  className={styles.milestone}
                  style={{ '--ms-color': item.color } as CSSProperties}
                  aria-pressed={item.id === milestoneId}
                  aria-label={milestoneAriaLabel(item)}
                  aria-describedby={`${hintId} ${countId}`}
                  onClick={() => select(item.id)}
                >
                  <span className={styles.msTop}>
                    <span className={styles.msStep}>{position + 1}</span>
                    <span id={countId} className={styles.msCount}>
                      {item.count} ta mavzu
                    </span>
                  </span>
                  <span className={styles.msLabel}>{item.label}</span>
                  <span id={hintId} className={styles.msHint}>
                    {item.hint}
                  </span>
                  <span className={styles.msExample}>
                    <span className={styles.msExampleLabel}>Misol:</span>
                    <span className={styles.msExpression}>{item.expression}</span>
                  </span>
                </button>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </>
  );
}
