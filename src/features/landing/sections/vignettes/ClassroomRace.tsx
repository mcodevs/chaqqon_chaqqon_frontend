import { type AnimationEvent, type CSSProperties, useId, useRef, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { DigitCharacter } from '@/shared/ui/DigitCharacter';
import { useInView } from '../../motion/useInView';
import { usePrefersReducedMotion } from '../../motion/usePrefersReducedMotion';
import styles from './Vignettes.module.css';

/** Starts once this much of the picture is on screen, so the visitor sees the whole race. */
const PLAY_WHEN = { threshold: 0.4 } as const;

/*
 * Three mascot pupils on the projector: how far each gets (`reach`, a share of the track) and its
 * place. The lane colours are in CSS.
 */
const LANES = [
  { digit: 1, reach: 0.92, place: 1 },
  { digit: 2, reach: 0.74, place: 3 },
  { digit: 3, reach: 0.83, place: 2 },
] as const;

/*
 * Every bar runs for the same time: the real match ranks by correct answers only and never times
 * them (domain/classroom.ts), so the picture must not show a speed race.
 */
const RACE_MS = 2100;

/* The medals land bronze to gold, a beat apart, so the drama comes from the podium, not the pace. */
const MEDAL_STEP_MS = 120;
const LAST_PLACE = Math.max(...LANES.map((lane) => lane.place));
const medalDelay = (place: number) => `${(LAST_PLACE - place) * MEDAL_STEP_MS}ms`;

/**
 * "Dars o'yinga aylanadi": the classroom match in miniature. Plays once when it comes into view:
 * every bar grows for the same time with its mascot riding the tip, then the medals land, gold last.
 * Afterwards "Yana ko'rish" plays it again; under reduced motion it is simply the finished race.
 */
export function ClassroomRace() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, PLAY_WHEN);
  const reduced = usePrefersReducedMotion();
  const captionId = useId();
  // Re-keys the lanes, which restarts every animation in them.
  const [run, setRun] = useState(0);
  const [played, setPlayed] = useState(false);

  // Only the medal's own animation counts, not one bubbling up from inside it. Gold lands last.
  const finish = (event: AnimationEvent<HTMLElement>) => {
    if (event.target === event.currentTarget) setPlayed(true);
  };

  return (
    <div ref={ref} className={styles.vignette}>
      <div className={styles.stage} data-kind="race" data-play={seen ? 'go' : 'wait'} aria-hidden="true">
        <ol key={run} className={styles.lanes}>
          {LANES.map((lane) => (
            <li
              key={lane.digit}
              className={styles.lane}
              data-lane={lane.digit}
              style={
                {
                  '--reach': lane.reach,
                  '--dur': `${RACE_MS}ms`,
                  '--medal-delay': medalDelay(lane.place),
                } as CSSProperties
              }
            >
              <span className={styles.laneLabel}>{lane.digit}-o'quvchi</span>
              <span className={styles.track}>
                <span className={styles.rail}>
                  <span className={styles.fill} />
                </span>
                <span className={styles.runner}>
                  <span className={styles.hopper}>
                    <DigitCharacter digit={lane.digit} size={32} />
                  </span>
                </span>
              </span>
              <span
                className={styles.medal}
                data-place={lane.place}
                onAnimationEnd={lane.place === 1 ? finish : undefined}
              >
                {lane.place}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className={styles.foot} data-replay={!reduced || undefined}>
        <p id={captionId} className={styles.caption}>
          Namuna: proyektorda {LANES.length} o'quvchi bellashuvi
        </p>
        {!reduced && (
          <span className={styles.replaySlot} data-ready={played || undefined}>
            <Button
              variant="ghost"
              tone="neutral"
              aria-describedby={captionId}
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
