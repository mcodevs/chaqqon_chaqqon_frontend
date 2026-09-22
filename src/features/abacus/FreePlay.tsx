import { useState } from 'react';
import { DEFAULT_RODS, MAX_RODS, MIN_RODS, toDigits } from '@/domain/practice/abacus';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ChoiceField } from '@/shared/ui/ChoiceField';
import { numberChoices } from '@/shared/ui/choiceOptions';
import { Soroban } from '@/shared/ui/Soroban';
import styles from './Abacus.module.css';

const ROD_CHOICES = numberChoices({ min: MIN_RODS, max: MAX_RODS });

/** "407" → "400 + 7", so the rods and the number are read as the same thing. */
function placeValues(value: number, rods: number): string {
  const parts = toDigits(value, rods)
    .map((digit, column) => digit * 10 ** column)
    .filter((part) => part > 0)
    .reverse();

  return parts.length > 1 ? parts.join(' + ') : '';
}

export function FreePlay() {
  const [rods, setRods] = useState(DEFAULT_RODS);
  const [value, setValue] = useState(0);
  const breakdown = placeValues(value, rods);

  return (
    <>
      <Card title="Abakus bilan o'ynang">
        <div className={styles.stage}>
          <Soroban value={value} rods={rods} onChange={setValue} size="lg" />
          <div className={styles.stage}>
            <p className={styles.caption}>Abakusdagi son</p>
            <span className={styles.readout}>{value}</span>
            {breakdown && <p className={styles.breakdown}>{breakdown}</p>}
          </div>
          <div className={styles.actions}>
            <Button variant="outline" tone="neutral" onClick={() => setValue(0)} disabled={value === 0}>
              Tozalash
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Sozlash">
        <ChoiceField
          label="Xonalar (ustunlar) soni"
          options={ROD_CHOICES}
          value={rods}
          onChange={(next) => {
            setRods(next);
            // Beads that fall off the shortened abacus would keep counting invisibly.
            setValue((current) => current % 10 ** next);
          }}
        />

        <details className={styles.legend}>
          <summary className={styles.legendSummary}>Abakus qanday tuzilgan?</summary>
          <ul className={styles.legendList}>
            <li>Har bir ustun — bitta xona: o'ngdan birinchisi birlar, keyingisi o'nlar, yuzlar…</li>
            <li>Chiziqdan yuqoridagi bitta tosh — 5. Uni pastga tushirsangiz, u sanaladi.</li>
            <li>Chiziqdan pastdagi to'rtta tosh — har biri 1. Ularni yuqoriga ko'tarib sanaysiz.</li>
            <li>Faqat chiziqqa tegib turgan toshlar sanaladi. Masalan 7 = 5 + 1 + 1.</li>
            <li>Toshni bosing — u va qo'shnilari barmoq bilan surgandek birga siljiydi.</li>
          </ul>
        </details>
      </Card>
    </>
  );
}
