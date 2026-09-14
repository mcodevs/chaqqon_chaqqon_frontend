import type { FlashPhase } from '@/domain/practice/session';
import { formatSigned } from '@/shared/format';
import styles from '../Practice.module.css';

interface FlashDigitsProps {
  phase: FlashPhase;
  value: number;
  isFirst: boolean;
  /** Announce numbers to screen readers; turned off when several panels flash at once. */
  announce?: boolean;
  className?: string;
}

/**
 * The flashed number. Plain digits keep attention on the calculation; only subtraction
 * is tinted so it is not missed. Size comes from the `--flash-size` custom property.
 */
export function FlashDigits({ phase, value, isFirst, announce = true, className = '' }: FlashDigitsProps) {
  const { sign, magnitude } = formatSigned(value, isFirst);
  const isShowing = phase === 'showing';

  return (
    <div
      className={`${styles.flashNumber} ${isShowing && value < 0 ? styles.negative : ''} ${className}`}
      aria-live={announce ? 'assertive' : 'off'}
    >
      {phase === 'ready' && <span className={styles.readyText}>Tayyor turing…</span>}
      {isShowing && (
        <>
          {sign && <span className={styles.flashSign}>{sign}</span>}
          <span>{magnitude}</span>
        </>
      )}
    </div>
  );
}
