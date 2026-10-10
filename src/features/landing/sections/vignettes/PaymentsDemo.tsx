import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { PAYMENT_QUICK_MONTHS, addMonths, schoolDate } from '@/domain/billing';
import { formatCalendarDate } from '@/shared/format';
import { type SegmentOption, SegmentedControl } from '@/shared/ui/SegmentedControl';
import { useInView } from '../../motion/useInView';
import motion from '../../motion/motion.module.css';
import styles from './Vignettes.module.css';

/** Fills the first month once this much of the picture is on screen. */
const PLAY_WHEN = { threshold: 0.4 } as const;

/** The teacher's own "To'ladi" shortcuts, the same constant PaymentForm offers. */
const MONTHS = PAYMENT_QUICK_MONTHS;
type Months = (typeof MONTHS)[number];

const OPTIONS: readonly SegmentOption<Months>[] = MONTHS.map((months) => ({
  value: months,
  label: `${months} oy`,
}));

/**
 * "Kim to'lamagani esdan chiqmaydi": the teacher's "To'ladi", to try. Picking a month shortcut shows
 * the real day the student's access would end, counted from today in Tashkent the way the app counts it,
 * and the polite live line says it aloud. Labels never break in two: on a narrow screen the options
 * scroll inside their own box.
 */
export function PaymentsDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, PLAY_WHEN);
  const [months, setMonths] = useState<Months>(1);
  // Fixed for the visit, so the date answers the choice and not the clock passing midnight.
  const [today] = useState(() => schoolDate(new Date()));

  // Only the row scrolls, never the page: the chosen option is nudged in from whichever edge hides it.
  useEffect(() => {
    const row = scroller.current;
    const chosen = row?.querySelector('[aria-checked="true"]');
    if (!row || !chosen) return;
    const edge = row.getBoundingClientRect();
    const option = chosen.getBoundingClientRect();
    if (option.left < edge.left) row.scrollLeft -= edge.left - option.left;
    else if (option.right > edge.right) row.scrollLeft += option.right - edge.right;
  }, [months]);

  return (
    <div ref={ref} className={styles.vignette}>
      <div className={styles.stage} data-kind="payments" data-play={seen ? 'go' : 'wait'}>
        <p className={styles.payLabel}>«To'ladi»: qancha muddatga?</p>

        <div ref={scroller} className={styles.payScroller}>
          <SegmentedControl
            label="Muddat"
            appearance="pill"
            options={OPTIONS}
            value={months}
            onChange={setMonths}
          />
        </div>

        <span
          className={styles.payTrack}
          aria-hidden="true"
          style={{ '--max': MONTHS.length } as CSSProperties}
        >
          {MONTHS.map((month, index) => (
            <span
              key={month}
              className={styles.paySeg}
              data-on={month <= months || undefined}
              style={{ '--seg': index } as CSSProperties}
            >
              <span className={styles.paySegFill} />
            </span>
          ))}
        </span>

        <p className={styles.payResult} aria-live="polite">
          {/* Re-keyed, so the new date bumps and the live region reads it as new. */}
          <span key={months} className={`${styles.payUntil} ${motion.bump}`}>
            <span aria-hidden="true">🔓</span>
            {formatCalendarDate(addMonths(today, months))} gacha ochiq
          </span>
        </p>
      </div>

      <div className={styles.foot}>
        <span className={styles.namuna}>Namuna</span>
      </div>
    </div>
  );
}
