import { useState } from 'react';
import { DEFAULT_RODS } from '@/domain/practice/abacus';
import { randomInt } from '@/domain/random';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { Soroban } from '@/shared/ui/Soroban';
import styles from './Abacus.module.css';

const DIGIT_OPTIONS = [
  { value: 1, label: '1 xona' },
  { value: 2, label: '2 xona' },
  { value: 3, label: '3 xona' },
] as const;

/** A fresh number of the asked size — never the one already on the board. */
function randomTarget(digitCount: number, avoid: number): number {
  const min = digitCount === 1 ? 1 : 10 ** (digitCount - 1);
  const max = 10 ** digitCount - 1;

  for (let tries = 0; tries < 20; tries++) {
    const value = randomInt(Math.random, min, max);
    if (value !== avoid) return value;
  }
  return min;
}

export function NumberDrill() {
  const [digitCount, setDigitCount] = useState(2);
  const [target, setTarget] = useState(() => randomTarget(2, 0));
  const [value, setValue] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showSample, setShowSample] = useState(false);

  const solved = value === target;

  const nextNumber = (digits: number) => {
    setTarget(randomTarget(digits, target));
    setValue(0);
    setShowSample(false);
  };

  const handleChange = (next: number) => {
    setValue(next);
    // Counted once, on the move that completes the number.
    if (next === target && !solved) setStreak((count) => count + 1);
  };

  return (
    <>
      <Card
        title="Shu sonni abakusda tering"
        actions={
          <span className={styles.streak}>
            <span aria-hidden="true">🔥</span>
            {streak} ta
          </span>
        }
      >
        <div className={styles.stage}>
          <div className={styles.target}>
            <p className={styles.caption}>Kerakli son</p>
            <span className={styles.targetNumber}>{target}</span>
          </div>

          <Soroban value={value} rods={DEFAULT_RODS} onChange={handleChange} size="lg" />

          {solved ? (
            <div className={styles.solved} role="status">
              <span aria-hidden="true">🎉</span>
              Barakalla! {target} tayyor.
            </div>
          ) : (
            <p className={styles.breakdown}>Hozir abakusda: {value}</p>
          )}

          <div className={styles.actions}>
            {solved ? (
              <Button size="lg" onClick={() => nextNumber(digitCount)}>
                Keyingi son
              </Button>
            ) : (
              <>
                <Button variant="outline" tone="neutral" onClick={() => setValue(0)} disabled={value === 0}>
                  Tozalash
                </Button>
                <Button variant="outline" tone="neutral" onClick={() => setShowSample((on) => !on)}>
                  {showSample ? 'Namunani yashirish' : "Namunani ko'rsatish"}
                </Button>
                <Button variant="ghost" tone="neutral" onClick={() => nextNumber(digitCount)}>
                  Boshqa son
                </Button>
              </>
            )}
          </div>

          {showSample && !solved && (
            <div className={styles.sample}>
              <p className={styles.caption}>Namuna</p>
              <Soroban
                value={target}
                rods={DEFAULT_RODS}
                size="sm"
                showDigits={false}
                label="Namuna abakus"
              />
            </div>
          )}
        </div>
      </Card>

      <Card title="Sozlash">
        <SegmentedControl
          label="Sonning xonalari"
          options={DIGIT_OPTIONS}
          value={digitCount}
          onChange={(next) => {
            setDigitCount(next);
            nextNumber(next);
          }}
        />
      </Card>
    </>
  );
}
