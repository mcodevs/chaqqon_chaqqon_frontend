import { useRef } from 'react';
import { DigitCharacter } from '@/shared/ui/DigitCharacter';
import { BrandMark } from '../../art/BrandMark';
import { useInView } from '../../motion/useInView';
import styles from './Vignettes.module.css';

/** Lands once this much of the picture is on screen. */
const PLAY_WHEN = { threshold: 0.4 } as const;

/** The same sample homework as the stars picture: all ten examples right. */
const EXAMPLES = 10;

/** The mascot on the picture, where the real one shows the child's own result. */
const MASCOT_DIGIT = 7;

/**
 * "Natija — chiroyli rasm": the result picture a child sends home, as a small tilted print on a
 * pile. Decorative, so hidden from screen readers: the card's text already says what it shows.
 * It lands once when it comes into view and straightens up when pointed at; nothing else moves.
 */
export function SharePreview() {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, PLAY_WHEN);

  return (
    <div ref={ref} className={styles.vignette} aria-hidden="true">
      <div className={styles.stage} data-kind="share" data-play={seen ? 'go' : 'wait'}>
        <span className={styles.shareBack} />
        <span className={styles.shareCard}>
          <span className={styles.shareTag}>Namuna</span>
          <span className={styles.shareBrand}>
            <BrandMark size={20} />
            Chaqqon-chaqqon
          </span>
          <span className={styles.shareTitle}>Uy vazifasi bajarildi</span>
          <span className={styles.shareScore}>
            {EXAMPLES} / {EXAMPLES} <span className={styles.shareTick}>✓</span>
          </span>
          <span className={styles.shareStar}>⭐ +1</span>
          <span className={styles.shareMascot}>
            <DigitCharacter digit={MASCOT_DIGIT} size={32} />
          </span>
        </span>
      </div>
    </div>
  );
}
