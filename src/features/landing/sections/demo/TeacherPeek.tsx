import type { CSSProperties } from 'react';
import { SECTION_META } from '@/features/practice/sections';
import { formatLastActive } from '@/shared/format';
import { NameAvatar } from '@/shared/ui/NameAvatar';
import motion from '../../motion/motion.module.css';
import type { DemoTally } from './demoConfig';
import styles from './TeacherPeek.module.css';

export interface TeacherPeekProps {
  tally: DemoTally;
}

/**
 * The demo round, as the teacher would see it: the guest becomes one student row in the teacher's
 * panel, beside two empty places for the teacher's own class. It shows only the guest's own score,
 * from the page's memory, and says so: nothing is stored or sent, and no classmates are invented.
 * Nothing renders before the first round.
 */
export function TeacherPeek({ tally }: TeacherPeekProps) {
  const { rounds, correct, lastSection } = tally;
  if (rounds === 0 || lastSection === null) return null;

  const section = SECTION_META[lastSection];
  // The guest has just played, so this is the panel's own "Hozir onlayn", worded by the same helper.
  const lastActive = formatLastActive(new Date().toISOString());

  return (
    <figure className={styles.peek}>
      {/*
       * Per-student results are the Statistika feature, so the caption names where they live. The
       * no-break space keeps "(Statistika bo'limida)" whole when a phone wraps the caption.
       */}
      <figcaption className={styles.caption}>
        Ustoz panelida (Statistika{'\u00A0'}bo'limida) shunday ko'rinadi
      </figcaption>

      <ul className={styles.roster}>
        <li className={styles.row}>
          <NameAvatar name="Siz" size={36} />
          <div className={styles.who}>
            <span className={styles.name}>Siz (mehmon)</span>
            <span className={styles.meta}>
              <span className={styles.online}>
                <span className={styles.onlineDot} aria-hidden="true" />
                {lastActive.text}
              </span>
              <span className={styles.section} style={{ '--section-color': section.color } as CSSProperties}>
                <span className={styles.sectionDot} aria-hidden="true" />
                {section.label}
              </span>
            </span>
          </div>
          {/* Re-keyed by the round, so each new result bumps it once; the first one arrives with the card. */}
          <span
            key={rounds}
            className={rounds > 1 ? `${styles.score} ${motion.bump}` : styles.score}
            data-all={correct === rounds || undefined}
          >
            {correct}/{rounds} to'g'ri
          </span>
        </li>
        <li className={styles.placeholder}>Bu yerda o'quvchilaringiz bo'ladi</li>
        {/* The same words twice would only be read twice. */}
        <li className={styles.placeholder} aria-hidden="true">
          Bu yerda o'quvchilaringiz bo'ladi
        </li>
      </ul>

      <p className={styles.footnote}>Bu — faqat shu sahifadagi natijangiz: u hech qayerga yuborilmaydi.</p>
    </figure>
  );
}
