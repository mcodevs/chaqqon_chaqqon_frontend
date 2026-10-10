import { type CSSProperties, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import { DigitCharacter } from '@/shared/ui/DigitCharacter';
import { Soroban } from '@/shared/ui/Soroban';
import motion from '../../motion/motion.module.css';
import styles from '../AbacusSection.module.css';
import { CURRICULUM_RODS, drawPlaceTarget } from './curriculum';

/** Each digit mascot of a placed number pops this much after the one before it. */
const CHEER_STAGGER_MS = 100;

/**
 * "O'zingiz suring": the visitor sets a two-digit number on a real, touchable abacus. The beads are
 * buttons, sized through `--soroban-rod-w` to a 44px target on a 360px phone. A placed number is
 * cheered by its own digits as mascots and counted; the next one waits for the visitor, never a timer.
 */
export function PlaceNumberGame({ hidden = false }: { hidden?: boolean }) {
  const [target, setTarget] = useState(() => drawPlaceTarget(Math.random, null));
  const [value, setValue] = useState(0);
  const [placed, setPlaced] = useState(0);
  // A number counts once: moving a bead off and back on must not count it again.
  const [scored, setScored] = useState(false);

  const solved = value === target;

  const change = (next: number) => {
    setValue(next);
    if (next === target && !scored) {
      setScored(true);
      setPlaced((count) => count + 1);
    }
  };

  const nextTarget = () => {
    setTarget(drawPlaceTarget(Math.random, target));
    setValue(0);
    setScored(false);
  };

  return (
    <div className={`${styles.slot} ${motion.rise}`} hidden={hidden}>
      <div className={`${styles.stage} ${styles.game}`}>
        <div className={styles.stageTop}>
          <p className={styles.prompt}>
            Abakusda{' '}
            <span key={target} className={`${styles.target} ${motion.pop}`}>
              {target}
            </span>{' '}
            sonini qo'ying
          </p>
          <p className={styles.hint}>
            Toshni bosing — u suriladi.
            {/* Tab means nothing on a phone: the keyboard half shows only where a mouse is around. */}
            <span className={styles.keyboardHint}> Klaviaturada: Tab bilan tanlab, Enter'ni bosing.</span>
          </p>
        </div>

        <div className={`${styles.abacus} ${styles.gameAbacus}`}>
          <div className={styles.abacusFrame}>
            <Soroban
              value={value}
              onChange={change}
              rods={CURRICULUM_RODS}
              size="lg"
              showDigits
              label="Abakus"
            />
            {solved &&
              String(target)
                .split('')
                .map((digit, position) => (
                  <span
                    key={`${target}-${position}`}
                    className={`${styles.mascot} ${motion.pop}`}
                    data-side={position === 0 ? 'start' : 'end'}
                    style={{ '--lp-delay': `${position * CHEER_STAGGER_MS}ms` } as CSSProperties}
                    aria-hidden="true"
                  >
                    <DigitCharacter digit={Number(digit)} size={40} />
                  </span>
                ))}
          </div>
        </div>

        {/* Always in the DOM, so the first "Barakalla" is announced like every later one. */}
        <div className={styles.caption}>
          <p className={styles.status} role="status">
            {solved && (
              <span key={target} className={`${styles.statusPill} ${motion.pop}`}>
                <span aria-hidden="true">✓</span>
                Barakalla! {target} to'g'ri qo'yildi
              </span>
            )}
          </p>
        </div>

        <div className={styles.controls}>
          <Button
            variant="ghost"
            tone="neutral"
            aria-disabled={value === 0 || undefined}
            onClick={() => setValue(0)}
          >
            Tozalash
          </Button>
          {/* One button that changes its word, so a keyboard visitor keeps their place after "Keyingi son". */}
          <Button
            variant={solved ? 'secondary' : 'ghost'}
            tone={solved ? 'brand' : 'neutral'}
            onClick={nextTarget}
          >
            {solved ? 'Keyingi son' : 'Boshqa son'}
          </Button>
          <p className={styles.tally}>
            Qo'yilgan:{' '}
            <span
              key={placed}
              className={placed > 0 ? `${styles.tallyCount} ${motion.bump}` : styles.tallyCount}
            >
              {placed}
            </span>{' '}
            ta
          </p>
        </div>
      </div>
    </div>
  );
}
