import { type FocusEvent, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { PlatformSettings } from '@/application/ports';
import { FEATURE_META, type Tariff, dailyPrice } from '@/domain/teacherBilling';
import { formatCount, formatSom } from '@/shared/format';
import { Button } from '@/shared/ui/Button';
import { BrandMark } from '../art/BrandMark';
import { assuranceItems } from '../content/landingCopy';
import {
  STUDENT_COUNT_OPTIONS,
  cheapestFitting,
  fitsStudents,
  perStudentPrice,
  showStudentsChooser,
} from '../content/pricing';
import { Reveal } from '../motion/Reveal';
import { prefersReducedMotion } from '../motion/usePrefersReducedMotion';
import { useInView } from '../motion/useInView';
import landing from '../Landing.module.css';
import motion from '../motion/motion.module.css';
import styles from './Tariffs.module.css';

/** Open in every tariff whatever its features (see FEATURES in teacherBilling.ts). */
const INCLUDED = [
  'Mashqlar va abakus',
  "O'quvchining o'z natijalari",
  "O'quvchilar to'lovini nazorat qilish",
];

/** The same promise, as the first lines of every card's list. */
const CARD_BASICS = ['Mashqlar va abakus', "O'quvchilar to'lovini nazorat qilish"];

/**
 * The featured card's ring glows once this share of it is on screen, so the visitor sees it happen.
 * Low enough that a card with a long feature list still gets there on a short landscape phone.
 */
const GLOW_IN_VIEW = { threshold: 0.3 } as const;

/** Below this width two or more cards share one row that scrolls sideways (Tariffs.module.css). */
const PHONE = '(max-width: 767.98px)';

export interface TariffsProps {
  /** Offered tariffs in their sortOrder; undefined while loading, empty when none is public. */
  tariffs: Tariff[] | undefined;
  settings: PlatformSettings | undefined;
  /** The class size picked in the chooser; it also prefills the form. */
  studentsCount: number | null;
  onStudentsCount: (n: number | null) => void;
  /** A card's tariff id, or null from the empty state. */
  onApply: (tariffId: string | null) => void;
}

/**
 * #tariflar: what the platform costs. Cards keep the order the admin gave them; the class-size
 * chooser only adds facts to them (per-student price, what fits, the cheapest that fits) and never
 * re-sorts them or turns into a "from X so'm per child" headline. Works with no public tariffs at
 * all, which is today's production.
 */
export function Tariffs({ tariffs, settings, studentsCount, onStudentsCount, onApply }: TariffsProps) {
  const chooser = showStudentsChooser(tariffs);
  // A size picked before the offer changed and the chooser went away no longer means anything.
  const students = chooser ? studentsCount : null;
  const cheapestId = tariffs && students !== null ? cheapestFitting(tariffs, students) : null;

  return (
    <section id="tariflar" aria-labelledby="tariflar-title" className={`${landing.section} ${landing.band}`}>
      <div className={landing.sectionHead} data-align="center">
        <p className={landing.eyebrow}>Tariflar</p>
        <h2 id="tariflar-title" className={landing.sectionTitle}>
          O'zingizga mos tarifni tanlang
        </h2>
        {/* "Per month" above a card with no prices would only puzzle, so the empty state drops it. */}
        {tariffs?.length !== 0 && (
          <p className={landing.lead}>
            Narx — oyiga.
            {chooser &&
              " O'quvchilaringiz sonini tanlasangiz, bir o'quvchiga qancha tushishini ham ko'rasiz."}
          </p>
        )}
      </div>

      <Included />
      {chooser && <StudentsChooser value={students} onChange={onStudentsCount} />}

      {tariffs === undefined ? (
        <SkeletonCards />
      ) : tariffs.length === 0 ? (
        <EmptyTariffs onApply={onApply} />
      ) : (
        <TariffList tariffs={tariffs} students={students} cheapestId={cheapestId} onApply={onApply} />
      )}

      <Assurances settings={settings} />
    </section>
  );
}

/** "Har bir tarifda:": the part of the offer no tariff choice can take away. */
function Included() {
  const labelId = useId();
  return (
    <div className={styles.included}>
      <p id={labelId} className={styles.includedLabel}>
        Har bir tarifda:
      </p>
      <ul aria-labelledby={labelId} className={styles.includedList}>
        {INCLUDED.map((text) => (
          <li key={text} className={styles.includedChip}>
            <Check />
            {text}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Class-size chips. Not a SegmentedControl: that one cannot be cleared, and pressing the chosen
 * chip again here clears it. A label never breaks in two; a row too wide scrolls inside itself.
 */
function StudentsChooser({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (n: number | null) => void;
}) {
  const labelId = useId();
  const scroller = useRef<HTMLDivElement>(null);

  // Only the row scrolls, never the page: the chosen chip is nudged in from whichever edge hides it.
  useEffect(() => {
    const row = scroller.current;
    const chosen = row?.querySelector('[aria-pressed="true"]');
    if (!row || !chosen) return;
    const edge = row.getBoundingClientRect();
    const chip = chosen.getBoundingClientRect();
    if (chip.left < edge.left) row.scrollLeft -= edge.left - chip.left;
    else if (chip.right > edge.right) row.scrollLeft += chip.right - edge.right;
  }, [value]);

  return (
    <div className={styles.chooser}>
      <p id={labelId} className={styles.chooserLabel}>
        Nechta o'quvchingiz bor?
      </p>
      <div ref={scroller} className={styles.chipScroller}>
        <div role="group" aria-labelledby={labelId} className={styles.chips}>
          {STUDENT_COUNT_OPTIONS.map((n) => {
            const pressed = value === n;
            return (
              <button
                key={n}
                type="button"
                className={styles.chip}
                aria-pressed={pressed}
                aria-label={`${n} o'quvchi`}
                onClick={() => onChange(pressed ? null : n)}
              >
                {/* The chosen state is shown by a tick, not by colour alone. */}
                <span className={styles.chipTick} aria-hidden="true">
                  ✓
                </span>
                {/* Re-keyed so the number bumps on each pick; the button itself keeps its focus. */}
                <span
                  key={pressed ? 'on' : 'off'}
                  className={pressed ? `${styles.chipLabel} ${motion.bump}` : styles.chipLabel}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * The cards, laid out by how many there are (see the CSS): a phone puts two or more in a row that
 * scrolls sideways with the recommended one in the middle; a desktop sets exactly three side by
 * side; otherwise, from a tablet up, they stack as wide cards.
 */
function TariffList({
  tariffs,
  students,
  cheapestId,
  onApply,
}: {
  tariffs: Tariff[];
  students: number | null;
  cheapestId: string | null;
  onApply: (tariffId: string | null) => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);
  const count = tariffs.length;
  const scrollRow = count >= 2;
  const featured = Math.max(
    0,
    tariffs.findIndex((tariff) => tariff.isFeatured),
  );
  // Which card the phone's position hint marks: the one nearest the middle of the row.
  const [current, setCurrent] = useState(featured);
  // Re-centred only when the offer itself changes, never on a refetch while the visitor browses.
  const offerKey = tariffs.map((tariff) => tariff.id).join(' ');

  // The recommended card starts in the middle of the phone's row. Only the row scrolls, never the page.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !scrollRow || typeof window.matchMedia !== 'function') return;
    const phone = window.matchMedia(PHONE);
    const centre = () => {
      if (!phone.matches) return;
      const left = centredLeft(list, list.children[featured]);
      if (left !== null) list.scrollLeft = left;
    };
    centre();
    phone.addEventListener('change', centre);
    return () => phone.removeEventListener('change', centre);
  }, [offerKey, featured, scrollRow]);

  // Each card in the phone's row is as tall as its own list, and the row as tall as the cards that
  // fill it, so a short card leaves no blank under it. Refitted as the row scrolls, and whenever a
  // card changes height (a class size picked, the screen turned).
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list || !scrollRow) return;
    fitRowHeight(list);
    if (typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(() => fitRowHeight(list));
    Array.from(list.children).forEach((cell) => observer.observe(cell));
    return () => observer.disconnect();
  }, [offerKey, scrollRow]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || !scrollRow) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setCurrent(nearestCell(list));
        fitRowHeight(list);
      });
    };
    list.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      list.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, [scrollRow]);

  // A keyboard reaching a card's button brings the whole card into the row's view, not just the button.
  const keepFocusedCardInView = (event: FocusEvent<HTMLUListElement>) => {
    const list = event.currentTarget;
    const target = event.target;
    if (list.scrollWidth <= list.clientWidth || !(target instanceof Node)) return;
    const cell = Array.from(list.children).find((child) => child.contains(target));
    if (!(cell instanceof HTMLElement)) return;
    const shownFrom = cell.offsetLeft - list.scrollLeft;
    if (shownFrom >= 0 && shownFrom + cell.offsetWidth <= list.clientWidth) return;
    const left = centredLeft(list, cell);
    if (left !== null) list.scrollTo({ left, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  return (
    <>
      <ul
        ref={listRef}
        className={styles.grid}
        data-count={count}
        data-row={scrollRow || undefined}
        onFocus={scrollRow ? keepFocusedCardInView : undefined}
      >
        {tariffs.map((tariff, index) => (
          <Reveal as="li" key={tariff.id} index={index} className={styles.cell}>
            <TariffCard
              tariff={tariff}
              students={students}
              cheapest={tariff.id === cheapestId}
              onApply={onApply}
            />
          </Reveal>
        ))}
      </ul>
      {/* Where the phone's row is: a quiet mark, not a control (swiping and Tab do the moving). */}
      {scrollRow && (
        <div className={styles.dots} aria-hidden="true">
          {tariffs.map((tariff, index) => (
            <span key={tariff.id} className={styles.dot} data-current={index === current || undefined} />
          ))}
        </div>
      )}
    </>
  );
}

/** The row's scroll position that puts `cell` in its middle, or null when there is no such cell. */
function centredLeft(list: HTMLElement, cell: Element | undefined): number | null {
  if (!(cell instanceof HTMLElement)) return null;
  return cell.offsetLeft - (list.clientWidth - cell.offsetWidth) / 2;
}

/**
 * Sets the phone row's height (Tariffs.module.css reads --row-height there; elsewhere it is unused):
 * the tallest card with at least a quarter of itself in view. At rest that is the card in the middle,
 * whatever its neighbours' peeking edges hold; mid-swipe, the taller of the two sharing the screen,
 * so neither is cut while it is still being read.
 */
function fitRowHeight(list: HTMLElement) {
  const from = list.scrollLeft;
  const to = from + list.clientWidth;
  let tallest = 0;
  Array.from(list.children).forEach((cell) => {
    if (!(cell instanceof HTMLElement)) return;
    const shown = Math.min(to, cell.offsetLeft + cell.offsetWidth) - Math.max(from, cell.offsetLeft);
    if (shown >= cell.offsetWidth / 4) tallest = Math.max(tallest, cell.offsetHeight);
  });
  if (tallest > 0) list.style.setProperty('--row-height', `${tallest}px`);
  else list.style.removeProperty('--row-height');
}

/** The index of the card nearest the middle of the row. */
function nearestCell(list: HTMLElement): number {
  const middle = list.scrollLeft + list.clientWidth / 2;
  let nearest = 0;
  let nearestDistance = Infinity;
  Array.from(list.children).forEach((cell, index) => {
    if (!(cell instanceof HTMLElement)) return;
    const distance = Math.abs(cell.offsetLeft + cell.offsetWidth / 2 - middle);
    if (distance < nearestDistance) {
      nearest = index;
      nearestDistance = distance;
    }
  });
  return nearest;
}

function TariffCard({
  tariff,
  students,
  cheapest,
  onApply,
}: {
  tariff: Tariff;
  students: number | null;
  cheapest: boolean;
  onApply: (tariffId: string | null) => void;
}) {
  const nameId = useId();
  const free = tariff.monthlyPrice <= 0;
  const fits = students === null ? null : fitsStudents(tariff, students);
  const perStudent = perStudentPrice(tariff, students);

  return (
    <article
      className={styles.card}
      aria-labelledby={nameId}
      data-featured={tariff.isFeatured || undefined}
      data-fit={fits === null ? undefined : fits ? 'yes' : 'no'}
    >
      {tariff.isFeatured && <FeaturedMarks />}

      {/* Name, price and limit: beside the feature list on a wide card, above it elsewhere. */}
      <div className={styles.summary}>
        <div className={styles.cardHead}>
          <h3 id={nameId} className={styles.name}>
            {tariff.name}
          </h3>
          {/* The admin form promises the description "under the tariff name". */}
          {tariff.description && <p className={styles.description}>{tariff.description}</p>}
        </div>

        <div>
          <p className={styles.price}>
            {free ? (
              <span className={styles.amount}>Bepul</span>
            ) : (
              <>
                <span className={styles.amount}>{formatCount(tariff.monthlyPrice)}</span>{' '}
                <span className={styles.unit}>so'm / oy</span>
              </>
            )}
          </p>
          {!free && (
            <p className={styles.daily}>kuniga taxminan {formatSom(dailyPrice(tariff.monthlyPrice))}</p>
          )}
        </div>

        <p className={styles.limit}>
          <span aria-hidden="true">👥</span>
          {tariff.maxStudents === null
            ? "O'quvchilar soni cheklanmagan"
            : `${tariff.maxStudents} tagacha o'quvchi`}
        </p>

        {students !== null && (
          <div className={styles.fit}>
            {cheapest && (
              <span key={students} className={`${styles.cheapest} ${motion.pop}`}>
                <span aria-hidden="true">✓</span> {students} o'quvchi uchun eng arzoni
              </span>
            )}
            {perStudent !== null && (
              <p className={styles.perStudent}>
                1 o'quvchiga oyiga taxminan{' '}
                <strong key={students} className={`${styles.perAmount} ${motion.bump}`}>
                  {formatSom(perStudent)}
                </strong>
              </p>
            )}
            {!fits && <p className={styles.noFit}>{students} o'quvchiga yetmaydi</p>}
          </div>
        )}
      </div>

      <ul className={styles.features}>
        {CARD_BASICS.map((text) => (
          <li key={text} className={styles.feature}>
            <Check />
            <span>{text}</span>
          </li>
        ))}
        {tariff.features.map((feature) => {
          const meta = FEATURE_META[feature];
          return (
            <li key={feature} className={styles.feature}>
              <Check />
              <span>
                {meta.label}
                {meta.student && <span className={styles.forStudents}> · o'quvchiga: {meta.student}</span>}
              </span>
            </li>
          );
        })}
      </ul>

      <Button
        variant={tariff.isFeatured ? 'primary' : 'outline'}
        size="lg"
        block
        className={styles.apply}
        aria-describedby={nameId}
        onClick={() => onApply(tariff.id)}
      >
        Shu tarifga ariza
      </Button>
    </article>
  );
}

/**
 * The recommended card's badge and its one-time glow. Both wait until the card is really on screen,
 * so the visitor sees the ring light up once and settle; the glow ends invisible, leaving only the
 * card's own brand ring (never a second coloured one).
 */
function FeaturedMarks() {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, GLOW_IN_VIEW);
  const play = seen ? 'go' : 'wait';
  return (
    <>
      <span ref={ref} className={styles.glow} data-play={play} aria-hidden="true" />
      <p className={styles.badge} data-play={play}>
        <span aria-hidden="true">⭐</span> Tavsiya etamiz
      </p>
    </>
  );
}

/**
 * Two placeholder cards while the tariffs load, as tall as real ones, so the page below (and an
 * invite's #ariza jump) does not move when they arrive. The pulse is finite, not a shimmer loop.
 */
function SkeletonCards() {
  return (
    <div className={styles.grid} aria-busy="true">
      <span className={landing.visuallyHidden}>Tariflar yuklanmoqda…</span>
      {[0, 1].map((index) => (
        <div key={index} className={styles.skeleton} aria-hidden="true" data-ambient>
          <span className={styles.bone} data-bone="name" />
          <span className={styles.bone} data-bone="short" />
          <span className={styles.bone} data-bone="price" />
          <span className={styles.bone} data-bone="daily" />
          <span className={styles.bone} data-bone="limit" />
          <span className={styles.boneRule} />
          <span className={styles.bone} data-bone="line" />
          <span className={styles.bone} data-bone="line" />
          <span className={styles.bone} data-bone="short" />
          <span className={styles.bone} data-bone="button" />
        </div>
      ))}
    </div>
  );
}

/** No public tariff yet: the conversation about prices happens after the application. */
function EmptyTariffs({ onApply }: { onApply: (tariffId: string | null) => void }) {
  return (
    <Reveal className={styles.empty}>
      <BrandMark size={56} />
      <p className={styles.emptyText}>
        Tariflar haqida ariza qoldirganingizdan keyin batafsil aytib beramiz.
      </p>
      <Button variant="outline" size="lg" className={styles.emptyAction} onClick={() => onApply(null)}>
        Ariza qoldirish
      </Button>
    </Reveal>
  );
}

/** Trial, money back and the referral reward, right under the prices: whichever the admin offers. */
function Assurances({ settings }: { settings: PlatformSettings | undefined }) {
  const items = assuranceItems(settings);
  if (items.length === 0) return null;
  return (
    <ul className={styles.assurances}>
      {items.map((item, index) => (
        <Reveal as="li" key={item.id} index={index} className={styles.assurance}>
          <span className={styles.assuranceIcon} aria-hidden="true">
            {item.icon}
          </span>
          <span className={styles.assuranceBody}>
            <strong className={styles.assuranceTitle}>{item.title}</strong>
            <span className={styles.assuranceText}>{item.text}</span>
          </span>
        </Reveal>
      ))}
    </ul>
  );
}

/** A small round tick; the list item around it carries the meaning. */
function Check() {
  return (
    <span className={styles.check} aria-hidden="true">
      ✓
    </span>
  );
}
