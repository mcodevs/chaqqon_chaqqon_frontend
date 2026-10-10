import { type CSSProperties, type ReactNode, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { PlatformSettings, PublicStats } from '@/application/ports';
import type { SectionId } from '@/domain/practice/config';
import type { Tariff } from '@/domain/teacherBilling';
import { formatCount } from '@/shared/format';
import { Button } from '@/shared/ui/Button';
import { DigitCharacter } from '@/shared/ui/DigitCharacter';
import landing from '../Landing.module.css';
import { ctaLabel, offerNoteParts } from '../content/landingCopy';
import { platformFacts, visibleFacts } from '../content/landingFacts';
import { useCountUp } from '../motion/useCountUp';
import { useInView } from '../motion/useInView';
import motion from '../motion/motion.module.css';
import { DemoStage } from './demo/DemoStage';
import { TeacherPeek } from './demo/TeacherPeek';
import type { DemoTally } from './demo/demoConfig';
import styles from './Hero.module.css';

/*
 * The stage's three hosts, peeking over its top edge where no text is: they pop up once as the
 * stage arrives and hop once for every correct answer, and otherwise stand still.
 */
const MASCOTS = [
  { digit: 3, place: 'left' },
  { digit: 7, place: 'mid' },
  { digit: 1, place: 'right' },
] as const;
const MASCOT_SIZE = 40;
/** The first pop waits until the stage card is on its way in; all three land by 700ms. */
const MASCOT_POP_START_MS = 220;
const MASCOT_POP_STAGGER_MS = 80;
const MASCOT_HOP_STAGGER_MS = 70;
/** Live counts that arrive after first paint settle in one after another. */
const LIVE_FACT_STAGGER_MS = 60;

export interface HeroProps {
  settings: PlatformSettings | undefined;
  stats: PublicStats | undefined;
  /** Offered tariffs: the proof facts about a tariff section follow them, as the feature cards do. */
  tariffs: Tariff[] | undefined;
  /** The guest's demo score: TeacherPeek shows it, and each new correct answer makes the mascots hop. */
  tally: DemoTally;
  onResult: (isCorrect: boolean, section: SectionId) => void;
  onBusyChange: (busy: boolean) => void;
  /** Scrolls to the application form; the hero's apply pill and the demo's bridge link both call it. */
  onApply: () => void;
}

/**
 * The first screen: the visitor plays a real flash-anzan round in it, and the stage action is the
 * screen's one primary button. The apply pill right under the stage is secondary on purpose, yet
 * still inside a 360×640 phone's first view (see the budget in Hero.module.css).
 *
 * The pieces rise in once at first paint, 70ms apart, except the H1: it is the page's largest
 * text, so it paints at once. The stage card takes its turn with a landing of its own, a slight
 * grow on top of the rise, so the screen's anchor does not move like the eyebrow text.
 */
export function Hero({ settings, stats, tariffs, tally, onResult, onBusyChange, onApply }: HeroProps) {
  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.inner}>
        <div className={styles.head}>
          <p className={`${landing.eyebrow} ${motion.heroRise}`} style={entrance(0)}>
            Mental arifmetika ustozlari uchun
          </p>
          <h1 id="hero-title" className={styles.title}>
            O'quvchilaringiz uyda shunday mashq qiladi
          </h1>
          {/*
           * True on every tariff: the always-open roster shows each student's streak or days since
           * the last practice, while per-student results sit behind the Statistika feature. Short
           * enough to stay on one line at 360px, which the first-view budget counts on.
           */}
          <p className={`${styles.subline} ${motion.heroRise}`} style={entrance(1)}>
            Siz esa kim mashq qilganini ko'rasiz.
          </p>
        </div>

        <div className={styles.stage}>
          {/* Lands in entrance slot 2 with an animation of its own (see .land). */}
          <div className={`${styles.stageCard} ${styles.land}`}>
            <StageMascots cheers={tally.correct} />
            <DemoStage
              rounds={tally.rounds}
              onResult={onResult}
              onBusyChange={onBusyChange}
              onApply={onApply}
            />
          </div>
          <TeacherPeek tally={tally} />
        </div>

        <div className={styles.rest}>
          <div className={`${styles.offer} ${motion.heroRise}`} style={entrance(3)}>
            <div className={styles.ctaRow}>
              {/*
               * The id marks the apply pill alone, the hero's own way to the form: the 360×640 budget
               * counts it, and the phone's sticky apply bar stays away while it is on screen or ahead.
               */}
              <Button id="hero-cta" variant="secondary" size="lg" className={styles.cta} onClick={onApply}>
                {ctaLabel(settings)}
              </Button>
              <Link to="/login" className={styles.login}>
                Akkauntim bor — kirish
              </Link>
            </div>
            {/* Rendered even while empty: its reserved two lines keep the page still as settings load. */}
            <p className={styles.offerNote}>{offerNoteParts(settings).join(' · ')}</p>
          </div>

          <div className={`${styles.proof} ${motion.heroRise}`} style={entrance(4)}>
            {/* Names only what every tariff has: the first view never promises a section a tariff lacks. */}
            <p className={`${landing.lead} ${styles.proofLead}`}>
              O'quvchilar to'lovi va abakus ham shu yerda. Telefon, planshet, kompyuter va Telegram'da
              ishlaydi.
            </p>
            <ProofFacts stats={stats} tariffs={tariffs} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** A piece's turn in the first-paint entrance: motion's heroRise waits 70ms per step. */
function entrance(order: number): CSSProperties {
  return { '--i': order } as CSSProperties;
}

/**
 * Each mascot stands in a window that ends at the stage's top edge, so only its eyes and smile show
 * above the card. Three layers, because each motion needs its own transform: the window holds the
 * place, the middle layer pops up once, and the inner one is re-keyed by the number of correct
 * answers, which replays the hop without replaying the pop.
 */
function StageMascots({ cheers }: { cheers: number }) {
  return (
    <>
      {MASCOTS.map(({ digit, place }, index) => (
        <span key={digit} className={styles.mascot} data-place={place} aria-hidden="true">
          <span
            className={`${styles.mascotPop} ${motion.pop}`}
            style={delay(MASCOT_POP_START_MS + index * MASCOT_POP_STAGGER_MS)}
          >
            <span
              key={cheers}
              className={cheers > 0 ? `${styles.mascotHop} ${motion.hop}` : styles.mascotHop}
              style={delay(index * MASCOT_HOP_STAGGER_MS)}
            >
              <DigitCharacter digit={digit} size={MASCOT_SIZE} />
            </span>
          </span>
        </span>
      ))}
    </>
  );
}

/** Sets the one shared stagger every motion class reads; it inherits, so each layer sets its own. */
function delay(ms: number): CSSProperties {
  return { '--lp-delay': `${ms}ms` } as CSSProperties;
}

/**
 * The platform in numbers. Four are computed from the code and true from day one; the two about a
 * tariff section stay as they are while tariffs load, and only once they arrive drop out or name
 * their tariffs. The live counts join only past their thresholds, after the constant ones, so their
 * late arrival never moves a tile already on screen. Only the live ones count up, once, when the
 * list first comes into view.
 */
function ProofFacts({ stats, tariffs }: { stats: PublicStats | undefined; tariffs: Tariff[] | undefined }) {
  const list = useRef<HTMLUListElement>(null);
  const seen = useInView(list);
  const facts = useMemo(() => platformFacts(tariffs), [tariffs]);

  return (
    <ul ref={list} className={styles.facts}>
      {facts.map((fact) => (
        <Fact key={fact.id} value={fact.value} label={fact.label} caption={fact.caption} />
      ))}
      {visibleFacts(stats).map((fact, index) => (
        <Fact
          key={fact.id}
          live={index}
          value={<CountUp value={fact.value} start={seen} />}
          label={fact.label}
          caption={fact.caption}
        />
      ))}
    </ul>
  );
}

/**
 * One tile: the number and its label share a line while they fit (the label drops under the number
 * rather than breaking), the caption below. `live` is the tile's place among the live counts.
 */
function Fact({
  value,
  label,
  caption,
  live,
}: {
  value: ReactNode;
  label: string;
  caption: string;
  live?: number;
}) {
  const isLive = live !== undefined;
  return (
    <li
      className={isLive ? `${styles.fact} ${motion.rise}` : styles.fact}
      data-live={isLive || undefined}
      style={isLive ? delay(live * LIVE_FACT_STAGGER_MS) : undefined}
    >
      {/* The spaces keep a screen reader's "109 mavzu formulasizdan…" apart; layout ignores them. */}
      <span className={styles.factMain}>
        <span className={styles.factValue}>{value}</span> <span className={styles.factLabel}>{label}</span>
      </span>{' '}
      <span className={styles.factCaption}>{caption}</span>
    </li>
  );
}

/**
 * A live count rolling up to its value. A screen reader hears the final number once, from the
 * hidden copy; the invisible final number underneath holds the width, so the label beside the
 * rolling digits never shifts.
 */
function CountUp({ value, start }: { value: number; start: boolean }) {
  const shown = useCountUp(value, start);
  return (
    <span className={styles.count}>
      <span className={styles.countHold} aria-hidden="true">
        {formatCount(value)}
      </span>
      <span className={styles.countShown} aria-hidden="true">
        {formatCount(shown)}
      </span>
      <span className={landing.visuallyHidden}>{formatCount(value)}</span>
    </span>
  );
}
