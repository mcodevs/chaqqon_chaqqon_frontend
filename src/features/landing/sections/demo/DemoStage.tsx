import { type RefObject, useCallback, useEffect, useId, useRef, useState } from 'react';
import type { SectionId } from '@/domain/practice/config';
import type { Problem } from '@/domain/practice/problem';
import type { ProblemAttempt } from '@/domain/practice/session';
import { SECTION_META } from '@/features/practice/sections';
import { formatSeconds, formatSigned } from '@/shared/format';
import { Button } from '@/shared/ui/Button';
import { type SegmentOption, SegmentedControl } from '@/shared/ui/SegmentedControl';
import landing from '../../Landing.module.css';
import motion from '../../motion/motion.module.css';
import { useInView } from '../../motion/useInView';
import { usePrefersReducedMotion } from '../../motion/usePrefersReducedMotion';
import { DemoFeedback, DemoVerdict } from './DemoFeedback';
import { DemoRound } from './DemoRound';
import {
  DEFAULT_DEMO_SECTION,
  DEFAULT_DEMO_SPEED,
  DEMO_ROW_COUNT,
  DEMO_SECTIONS,
  DEMO_SPEEDS,
  type DemoSection,
  IDLE_GHOST_NUMBER,
  IDLE_TEASER_NUMBERS,
  IDLE_TEASER_STEP_MS,
  demoSpeedLabel,
  makeDemoProblem,
} from './demoConfig';
import styles from './DemoStage.module.css';

type Phase = 'idle' | 'round' | 'result';

/** A round as it was started: the tally records its section, and its speed never changes under it. */
interface Round {
  problem: Problem;
  section: DemoSection;
  speed: number;
}

const SECTION_OPTIONS: readonly SegmentOption<DemoSection>[] = DEMO_SECTIONS.map((id) => ({
  value: id,
  label: SECTION_META[id].label,
}));

const SPEED_OPTIONS: readonly SegmentOption<number>[] = DEMO_SPEEDS.map((speed) => ({
  value: speed,
  label: demoSpeedLabel(speed),
}));

/* The teaser waits for half the stage to be on screen, so it is seen rather than half-missed. */
const TEASER_WATCH = { threshold: 0.5 } as const;
/*
 * Starts as the hero's entrance settles the card (it lands, and its glow blooms, by ~620ms; the first
 * flash meets the landing's slow tail), so the whole teaser still ends by 2.5 s.
 */
const TEASER_LEAD_MS = 500;

export interface DemoStageProps {
  /** Rounds played so far, from the page's tally: the settings show from 1, the bridge from 2. */
  rounds: number;
  onResult: (isCorrect: boolean, section: SectionId) => void;
  /** True while a round runs, so the page can keep everything else still. */
  onBusyChange: (busy: boolean) => void;
  onApply: () => void;
}

/**
 * "Bir raund o'ynab ko'ring" (#sinab): the page's one interactive flash demo, a real anzan round
 * played by a guest. Idle → round → result, with the stage's single primary button in every phase:
 * Boshlash, then Tekshirish, then Yana bir raund.
 *
 * Nothing here focuses or announces anything until the visitor starts a round, and nothing leaves
 * the page: the score goes up to the page's tally through `onResult` and lives only in its memory.
 */
export function DemoStage({ rounds, onResult, onBusyChange, onApply }: DemoStageProps) {
  const verdictId = useId();
  const stageRef = useRef<HTMLElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const refocusStart = useRef(false);

  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState<Round | null>(null);
  // Re-keys DemoRound: a new round, or the same numbers shown again, always starts from "Tayyor".
  const [roundId, setRoundId] = useState(0);
  // The speed and level the next round will use; the pills and "Tezroq" / "Sekinroq" set them.
  const [speed, setSpeed] = useState<number>(DEFAULT_DEMO_SPEED);
  const [section, setSection] = useState<DemoSection>(DEFAULT_DEMO_SECTION);
  const [attempt, setAttempt] = useState<ProblemAttempt | null>(null);
  const [replayOpen, setReplayOpen] = useState(false);
  // The page's tally keeps the streak too, but only the count comes down; this copy moves in step.
  const [streak, setStreak] = useState(0);

  const teaser = useIdleTeaser(stageRef);

  const begin = (nextSpeed: number) => {
    teaser.cancel();
    setSpeed(nextSpeed);
    setRound({ problem: makeDemoProblem(section, Math.random), section, speed: nextSpeed });
    setRoundId((id) => id + 1);
    setAttempt(null);
    setReplayOpen(false);
    setPhase('round');
    onBusyChange(true);
  };

  const showAgain = useCallback(() => setRoundId((id) => id + 1), []);

  const stop = useCallback(() => {
    // Hand the keyboard back to Boshlash only if it was in the stage: Escape pressed elsewhere stays there.
    const active = document.activeElement;
    refocusStart.current = !active || active === document.body || !!stageRef.current?.contains(active);
    setPhase('idle');
    onBusyChange(false);
  }, [onBusyChange]);

  const finish = (result: ProblemAttempt) => {
    if (!round) return;
    setAttempt(result);
    setStreak((count) => (result.isCorrect ? count + 1 : 0));
    setPhase('result');
    onResult(result.isCorrect, round.section);
    onBusyChange(false);
  };

  useEffect(() => {
    if (phase !== 'idle' || !refocusStart.current) return;
    refocusStart.current = false;
    startRef.current?.focus({ preventScroll: true });
  }, [phase]);

  const settings = rounds >= 1 && (
    <DemoSettings section={section} speed={speed} onSection={setSection} onSpeed={setSpeed} />
  );

  // A real link to the form, so it still lands there if the page's own jump never runs.
  const bridge = rounds >= 2 && (
    <p className={styles.bridge}>
      Shu mashqni o'quvchilaringizga bering{' '}
      <a
        href="#ariza"
        className={styles.bridgeLink}
        onClick={(event) => {
          event.preventDefault();
          onApply();
        }}
      >
        <span aria-hidden="true">→</span> Ariza qoldirish
      </a>
    </p>
  );

  const ghost = formatSigned(teaser.number, false);
  const idle = phase === 'idle';

  return (
    <section
      ref={stageRef}
      id="sinab"
      className={styles.stage}
      data-phase={phase}
      aria-labelledby="sinab-title"
    >
      <h2 id="sinab-title" className={landing.visuallyHidden}>
        Bir raund o'ynab ko'ring
      </h2>

      <div className={styles.card}>
        {phase !== 'round' && (
          <div className={styles.top}>
            <p className={landing.eyebrow}>Flesh-anzan · {DEMO_ROW_COUNT} ta son</p>
          </div>
        )}

        {/*
         * The verdict's live region exists from the round's start, empty, so filling it is a change a
         * screen reader announces. While idle there is none at all: the first screen stays silent.
         */}
        {!idle && (
          <p id={verdictId} role="status" className={styles.verdict}>
            {phase === 'result' && attempt && <DemoVerdict key={roundId} attempt={attempt} />}
          </p>
        )}

        {phase !== 'result' && (
          // Stays laid out under a running round, so the body keeps its height from idle to the answer.
          <div className={`${styles.layer} ${styles.idle}`} data-hidden={!idle || undefined} inert={!idle}>
            {/* Decorative: a screen reader hears nothing until the visitor starts a round. */}
            {/* Brighter only while the teaser flashes, so it reads as a flash screen, not a placeholder. */}
            <div
              className={styles.ghost}
              data-teaser={(teaser.animate && !teaser.invite) || undefined}
              aria-hidden="true"
            >
              <span
                key={teaser.key}
                className={teaser.animate ? `${styles.ghostNumber} ${motion.flashIn}` : styles.ghostNumber}
              >
                <span className={styles.ghostSign}>{ghost.sign}</span>
                <span>{ghost.magnitude}</span>
              </span>
            </div>
            {/* The no-break space keeps the dash closing the first line, never opening the second. */}
            <p className={styles.summary}>Sonlar birin-ketin chaqnaydi{'\u00A0'}— yig'indisini yozasiz.</p>
            <p className={styles.meta}>
              har biri {formatSeconds(speed)} soniya · {SECTION_META[section].label}
            </p>
            {/* Only on the visible idle layer: the hidden copy under a round keeps round one's height. */}
            {idle && settings}
            <Button
              ref={startRef}
              size="lg"
              block
              className={teaser.invite ? `${styles.start} ${motion.ringPulse}` : styles.start}
              onClick={() => begin(speed)}
            >
              Boshlash
            </Button>
            {idle && bridge}
          </div>
        )}

        {phase === 'round' && round && (
          <DemoRound
            key={roundId}
            problem={round.problem}
            speed={round.speed}
            stageRef={stageRef}
            onDone={finish}
            onShowAgain={showAgain}
            onStop={stop}
          />
        )}

        {phase === 'result' && attempt && (
          <div className={`${styles.layer} ${styles.result}`}>
            <DemoFeedback
              attempt={attempt}
              speed={speed}
              streak={streak}
              stageRef={stageRef}
              verdictId={verdictId}
              replayOpen={replayOpen}
              onReplayOpenChange={setReplayOpen}
              onSpeedRound={begin}
              onAgain={() => begin(speed)}
            >
              {settings}
            </DemoFeedback>
            {bridge}
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * The first-glance teaser: once, while the stage is in view and only with motion allowed, the ghost
 * flashes three numbers, then rests on the idle "+5" and invites a tap on Boshlash. Leaving view or
 * turning motion off mid-way puts it back to the still "+5", to play whole next time; starting a
 * round cancels it for good. Its timers end with it.
 */
function useIdleTeaser(stage: RefObject<HTMLElement | null>) {
  const reduced = usePrefersReducedMotion();
  // Followed in and out, not just first seen, so it never plays to a stage scrolled away.
  const seen = useInView(stage, { ...TEASER_WATCH, once: false });
  // null before the teaser, an index while it flashes, 'rest' once it is over.
  const [step, setStep] = useState<number | 'rest' | null>(null);
  const [cancelled, setCancelled] = useState(false);
  // Set only when it has played through, so a re-run effect (Strict Mode, a preference flip) starts it whole.
  const finished = useRef(false);

  useEffect(() => {
    if (!seen || reduced || cancelled || finished.current) return;
    const timers = IDLE_TEASER_NUMBERS.map((_, index) =>
      window.setTimeout(() => setStep(index), TEASER_LEAD_MS + index * IDLE_TEASER_STEP_MS),
    );
    timers.push(
      window.setTimeout(
        () => {
          finished.current = true;
          setStep('rest');
        },
        TEASER_LEAD_MS + IDLE_TEASER_NUMBERS.length * IDLE_TEASER_STEP_MS,
      ),
    );
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      // Cut short, it must not freeze on "+3" or "−2": back to the still ghost until it plays again.
      if (!finished.current) setStep(null);
    };
  }, [seen, reduced, cancelled]);

  // Reduced motion also mutes a step already reached, so nothing is left mid-flash or pulsing.
  const live = !cancelled && !reduced;
  const playing = live && typeof step === 'number';
  return {
    number: playing ? IDLE_TEASER_NUMBERS[step] : IDLE_GHOST_NUMBER,
    // A new key replays flashIn; the still ghost (first paint, or after a cancel) never animates.
    key: cancelled || step === null ? 'still' : String(step),
    animate: live && step !== null,
    invite: live && step === 'rest',
    cancel: () => {
      finished.current = true;
      setCancelled(true);
    },
  };
}

/** Daraja and Tezlik, shown from the first round on, for the round after this one. */
function DemoSettings({
  section,
  speed,
  onSection,
  onSpeed,
}: {
  section: DemoSection;
  speed: number;
  onSection: (section: DemoSection) => void;
  onSpeed: (speed: number) => void;
}) {
  // Each radiogroup carries its label's name, so the visible word is hidden from screen readers
  // rather than read twice.
  return (
    <div className={styles.settings}>
      <div className={styles.settingsGrid}>
        <span className={styles.settingLabel} aria-hidden="true">
          Daraja
        </span>
        <PillRow label="Daraja" options={SECTION_OPTIONS} value={section} onChange={onSection} />
        <span className={styles.settingLabel} aria-hidden="true">
          Tezlik
        </span>
        <PillRow label="Tezlik" options={SPEED_OPTIONS} value={speed} onChange={onSpeed} />
      </div>
    </div>
  );
}

/**
 * A pill row whose labels never break in two: wider than the card, it scrolls sideways in its own
 * box instead (the admin's FilterPills pattern), nudging the chosen pill into view by moving only
 * the row, never the page.
 */
function PillRow<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const row = box.current;
    const chosen = row?.querySelector('[aria-checked="true"]');
    if (!row || !chosen) return;
    const edge = row.getBoundingClientRect();
    const pill = chosen.getBoundingClientRect();
    if (pill.left < edge.left) row.scrollLeft -= edge.left - pill.left;
    else if (pill.right > edge.right) row.scrollLeft += pill.right - edge.right;
  }, [value]);

  return (
    <div ref={box} className={styles.pills}>
      <SegmentedControl label={label} appearance="pill" options={options} value={value} onChange={onChange} />
    </div>
  );
}
