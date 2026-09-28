import type { FlashPhase } from '@/domain/practice/session';
import { Soroban } from '@/shared/ui/Soroban';
import styles from '../Practice.module.css';

interface FlashSorobanProps {
  phase: FlashPhase;
  /** The number standing on the rods. */
  value: number;
  rods: number;
  size?: 'sm' | 'md' | 'lg';
  /** Announce the card to screen readers; turned off when several panels flash at once. */
  announce?: boolean;
  className?: string;
}

/**
 * The flashed card. The abacus is a picture here — never the digits under it, which would
 * turn reading the beads into reading a number.
 */
export function FlashSoroban({
  phase,
  value,
  rods,
  size = 'lg',
  announce = true,
  className = '',
}: FlashSorobanProps) {
  return (
    <div className={`${styles.flashCard} ${className}`} aria-live={announce ? 'assertive' : 'off'}>
      {phase === 'ready' && <span className={styles.readyText}>Tayyor turing…</span>}
      {phase === 'showing' && (
        <Soroban value={value} rods={rods} size={size} showDigits={false} label="Chaqnovchi karta" />
      )}
    </div>
  );
}
