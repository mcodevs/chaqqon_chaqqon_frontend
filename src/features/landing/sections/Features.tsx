import { type CSSProperties, type MouseEvent, useId, useRef } from 'react';
import type { Tariff } from '@/domain/teacherBilling';
import { DigitCharacter } from '@/shared/ui/DigitCharacter';
import landing from '../Landing.module.css';
import {
  FEATURE_GROUPS,
  type FeatureCard,
  type FeatureGroup,
  type FeatureVisual,
} from '../content/landingCopy';
import { featureCoverage, tariffTagLabel } from '../content/landingFacts';
import { Reveal } from '../motion/Reveal';
import { isPlainClick, scrollToId, sectionHeadingId } from '../motion/scrollToId';
import { useInView } from '../motion/useInView';
import { ClassroomRace } from './vignettes/ClassroomRace';
import { HomeworkStars } from './vignettes/HomeworkStars';
import { PaymentsDemo } from './vignettes/PaymentsDemo';
import { SharePreview } from './vignettes/SharePreview';
import styles from './Features.module.css';

export interface FeaturesProps {
  /** Offered tariffs in their sortOrder; undefined while loading, empty when none is public. */
  tariffs: Tariff[] | undefined;
}

/** A card as the offer stands: its tariff tag ("Pro tarifida"), or null when it needs none. */
interface ShownCard {
  card: FeatureCard;
  tag: string | null;
}

interface ShownGroup {
  group: FeatureGroup;
  cards: ShownCard[];
}

/**
 * The cards the offer can keep its word on. One no tariff opens is left out rather than promised;
 * one only some tariffs open says which; a group left with no cards goes too.
 */
function shownGroups(tariffs: Tariff[] | undefined): ShownGroup[] {
  return FEATURE_GROUPS.map((group) => ({
    group,
    cards: group.cards.flatMap((card): ShownCard[] => {
      const coverage = featureCoverage(tariffs, card.features, card.match);
      if (coverage.state === 'none') return [];
      return [{ card, tag: coverage.state === 'some' ? tariffTagLabel(coverage.names) : null }];
    }),
  })).filter((shown) => shown.cards.length > 0);
}

/** Where a card sits from a tablet up: its column, the grid row it starts on and how many it spans. */
interface Placement {
  column: 1 | 2;
  row: number;
  span: number;
}

/**
 * From a tablet up, a group's cards fill two columns in reading order, down the first and then down
 * the second, split where the two weigh the same: a card with a picture weighs about two plain ones.
 * Each card spans as many grid rows as it weighs, so both columns share rows and end on one line; a
 * card a little short of its rows stretches, and a picture takes up the slack. When no split is even
 * (one card, or a plain card and a pictured one) there is no plan: the cards stack full width, a
 * picture beside its text.
 */
function twoColumns(cards: readonly ShownCard[]): Placement[] | null {
  const weights = cards.map(({ card }) => (card.visual ? 2 : 1));
  const half = weights.reduce((sum, weight) => sum + weight, 0) / 2;

  let split = 0;
  let first = 0;
  while (split < weights.length && first < half) {
    first += weights[split];
    split += 1;
  }
  if (first !== half || split === weights.length) return null;

  let row = 1;
  return weights.map((span, index) => {
    if (index === split) row = 1;
    const placement: Placement = { column: index < split ? 1 : 2, row, span };
    row += span;
    return placement;
  });
}

/**
 * #imkoniyatlar: what the platform does, told as what the child, the teacher and the parent each
 * get. One audience after another: stacked on a phone; from a tablet up the host heads its row and
 * the cards share two even columns, and on a desktop the host keeps a column of its own beside them.
 * Three cards carry a small live picture and one a static print; every one of them says "Namuna".
 */
export function Features({ tariffs }: FeaturesProps) {
  const groups = shownGroups(tariffs);
  const tagged = groups.some((shown) => shown.cards.some((item) => item.tag !== null));

  return (
    <section id="imkoniyatlar" aria-labelledby="imkoniyatlar-title" className={landing.section}>
      <div className={landing.sectionHead}>
        <p className={landing.eyebrow}>Imkoniyatlar</p>
        <h2 id="imkoniyatlar-title" className={landing.sectionTitle}>
          Bola quvonadi, ustoz vaqt yutadi, ota-ona xotirjam
        </h2>
      </div>

      <div className={styles.groups}>
        {groups.map((shown) => (
          <Group key={shown.group.id} shown={shown} />
        ))}
      </div>

      {tagged && (
        <p className={styles.footnote}>
          Ba'zi bo'limlar tarifga bog'liq — qaysi tarifda borligi kartada yozilgan.
        </p>
      )}
    </section>
  );
}

/** One audience: its host mascot and promise, then its cards. */
function Group({ shown }: { shown: ShownGroup }) {
  const { group, cards } = shown;
  const titleId = useId();
  const plan = twoColumns(cards);

  return (
    <div className={styles.group} data-group={group.id}>
      <Reveal className={styles.groupHead}>
        <GroupMascot digit={group.mascot} />
        <GroupTitle id={titleId} title={group.title} />
      </Reveal>

      <ul className={styles.cards} data-layout={plan ? 'columns' : 'stack'} aria-labelledby={titleId}>
        {cards.map(({ card, tag }, index) => {
          const place = plan?.[index];
          return (
            // After the head, which rises first.
            <Reveal
              as="li"
              key={card.id}
              index={index + 1}
              className={styles.card}
              data-visual={card.visual}
              style={
                place &&
                ({ '--col': place.column, '--row': place.row, '--span': place.span } as CSSProperties)
              }
            >
              <Card card={card} tag={tag} />
            </Reveal>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * "Bola uchun — mashq o'yinga aylanadi" shown as an audience chip over the promise. The words and
 * the dash stay in the heading, so a screen reader hears the line exactly as written.
 */
function GroupTitle({ id, title }: { id: string; title: string }) {
  const dash = title.indexOf(' — ');
  if (dash < 0) {
    return (
      <h3 id={id} className={styles.groupTitle}>
        <span className={styles.promise}>{title}</span>
      </h3>
    );
  }
  return (
    <h3 id={id} className={styles.groupTitle}>
      <span className={styles.audience}>{title.slice(0, dash)}</span>
      <span className={landing.visuallyHidden}> — </span>
      <span className={styles.promise}>{title.slice(dash + 3)}</span>
    </h3>
  );
}

/**
 * The group's host. It pops into its disc when the group is reached; it hides beforehand only with
 * the landing's motion gate on (CSS), so it never waits for a sighting that cannot come.
 */
function GroupMascot({ digit }: { digit: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref);
  return (
    <span ref={ref} className={styles.mascot} data-play={seen ? 'go' : 'wait'} aria-hidden="true">
      <span className={styles.mascotInner}>
        <DigitCharacter digit={digit} size={40} />
      </span>
    </span>
  );
}

function Card({ card, tag }: ShownCard) {
  const { link, visual } = card;

  // An in-page link that also works without JS; with it, the scroll respects reduced motion and
  // focus follows to the section's heading, as with the header menu, so the next Tab starts there.
  const follow = (event: MouseEvent<HTMLAnchorElement>) => {
    const section = link ? document.getElementById(link.targetId) : null;
    if (!link || !section || !isPlainClick(event)) return;
    event.preventDefault();
    scrollToId(link.targetId, { focusId: sectionHeadingId(section) });
  };

  return (
    <>
      <div className={styles.cardBody}>
        <div className={styles.cardHead}>
          <span className={styles.tile} aria-hidden="true">
            {card.icon}
          </span>
          <h4 className={styles.cardTitle}>{card.title}</h4>
        </div>
        <div className={styles.cardWords}>
          <p className={styles.cardText}>{card.text}</p>
          {tag && <p className={styles.tag}>{tag}</p>}
          {link && (
            <a href={`#${link.targetId}`} className={styles.link} onClick={follow}>
              <LinkLabel label={link.label} />
            </a>
          )}
        </div>
      </div>
      {visual && (
        <div className={styles.visual}>
          <Vignette kind={visual} />
        </div>
      )}
    </>
  );
}

/** A trailing "↓" gets its own span, so it can nudge down on hover without moving the words. */
function LinkLabel({ label }: { label: string }) {
  if (!label.endsWith(' ↓')) return label;
  return (
    <>
      {label.slice(0, -2)}
      <span className={styles.linkArrow} aria-hidden="true">
        ↓
      </span>
    </>
  );
}

function Vignette({ kind }: { kind: FeatureVisual }) {
  switch (kind) {
    case 'stars':
      return <HomeworkStars />;
    case 'race':
      return <ClassroomRace />;
    case 'payments':
      return <PaymentsDemo />;
    case 'share':
      return <SharePreview />;
  }
}
