import type { CSSProperties } from 'react';
import {
  PRACTICE_LIMITS,
  type PracticeConfig,
  SECTION_IDS,
  normalizePracticeConfig,
} from '@/domain/practice/config';
import { formatSeconds } from '@/shared/format';
import { SliderField } from '@/shared/ui/SliderField';
import { toneColor } from '@/shared/ui/tone';
import styles from './Practice.module.css';
import { SECTION_META } from './sections';

interface PracticeConfigFieldsProps {
  value: PracticeConfig;
  onChange: (value: PracticeConfig) => void;
}

export function PracticeConfigFields({ value, onChange }: PracticeConfigFieldsProps) {
  const set = <K extends keyof PracticeConfig>(key: K, next: PracticeConfig[K]) =>
    onChange(normalizePracticeConfig({ ...value, [key]: next }));

  return (
    <>
      <div role="radiogroup" aria-label="Bo'lim" className={styles.sectionGrid}>
        {SECTION_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={value.section === id}
            className={styles.sectionChip}
            style={{ '--chip-color': toneColor(SECTION_META[id].tone) } as CSSProperties}
            onClick={() => set('section', id)}
          >
            <span className={styles.sectionLabel}>{SECTION_META[id].label}</span>
            <span className={styles.sectionDescription}>{SECTION_META[id].description}</span>
          </button>
        ))}
      </div>

      <SliderField
        label="Qator soni (necha son)"
        {...PRACTICE_LIMITS.rowCount}
        value={value.rowCount}
        onChange={(n) => set('rowCount', n)}
      />
      <SliderField
        label="Har bir son uchun vaqt (soniya)"
        {...PRACTICE_LIMITS.secondsPerNumber}
        formatValue={formatSeconds}
        value={value.secondsPerNumber}
        onChange={(n) => set('secondsPerNumber', n)}
      />
      <SliderField
        label="Misollar soni"
        {...PRACTICE_LIMITS.problemCount}
        value={value.problemCount}
        onChange={(n) => set('problemCount', n)}
      />
    </>
  );
}
