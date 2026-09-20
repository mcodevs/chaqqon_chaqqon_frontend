import { useState } from 'react';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import styles from './Abacus.module.css';
import { FormulaTutor } from './FormulaTutor';
import { FreePlay } from './FreePlay';
import { NumberDrill } from './NumberDrill';

type Mode = 'erkin' | 'terish' | 'formula';

const MODES = [
  { value: 'erkin', label: '✋ Erkin' },
  { value: 'terish', label: '🔢 Sonni ter' },
  { value: 'formula', label: '💡 Formula' },
] as const satisfies readonly { value: Mode; label: string }[];

const HINTS: Record<Mode, string> = {
  erkin: "Toshlarni bosib ko'ring — abakus qanday son ko'rsatayotganini pastda o'qiysiz.",
  terish: "Berilgan sonni abakusda teradigan mashq: toshlarni joyiga qo'ying.",
  formula: "Misol bosqichma-bosqich yechiladi: qaysi tosh qayerga ketishini abakusda ko'rasiz.",
};

/** Getting to know the soroban: play with it, build numbers on it, watch a formula run on it. */
export function AbacusPage() {
  const [mode, setMode] = useState<Mode>('erkin');

  return (
    <div className={styles.page}>
      <SegmentedControl label="Rejim" options={MODES} value={mode} onChange={setMode} />
      <p className={styles.intro}>{HINTS[mode]}</p>

      {mode === 'erkin' && <FreePlay />}
      {mode === 'terish' && <NumberDrill />}
      {mode === 'formula' && <FormulaTutor />}
    </div>
  );
}
