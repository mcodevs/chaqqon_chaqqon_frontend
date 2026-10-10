import { useState } from 'react';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import landing from '../Landing.module.css';
import { Reveal } from '../motion/Reveal';
import styles from './AbacusSection.module.css';
import { CurriculumPlayer } from './abacus/CurriculumPlayer';
import { PlaceNumberGame } from './abacus/PlaceNumberGame';
import { practiceChips } from './abacus/curriculum';

type AbacusMode = 'formulas' | 'free';

const MODE_OPTIONS = [
  { value: 'formulas', label: 'Formulalar' },
  { value: 'free', label: "O'zingiz suring" },
] as const;

/** Written from the drill limits once: they are constants, and the chips only describe them. */
const PRACTICE_CHIPS = practiceChips();

/**
 * #abakus: the visual soroban, in one abacus slot with two modes — the formula player led by the
 * curriculum rail, and a "push the beads yourself" game. The modes are never side by side; the one
 * not on show is hidden rather than dropped, so a pick or a game in progress survives a look at
 * the other.
 */
export function AbacusSection() {
  const [mode, setMode] = useState<AbacusMode>('formulas');
  // The game is built the first time it is asked for, so the page does not load fifteen bead buttons nobody uses.
  const [gameOpened, setGameOpened] = useState(false);

  const changeMode = (next: AbacusMode) => {
    setMode(next);
    if (next === 'free') setGameOpened(true);
  };

  return (
    <section id="abakus" aria-labelledby="abakus-title" className={`${landing.section} ${landing.band}`}>
      {/* data-mode lets a desktop give the game the full width the rail leaves behind. */}
      <div className={styles.layout} data-mode={mode}>
        <Reveal className={`${landing.sectionHead} ${styles.head}`}>
          <p className={landing.eyebrow}>Vizual soroban</p>
          <h2 id="abakus-title" className={landing.sectionTitle}>
            Formulani bola ko'z bilan ko'radi
          </h2>
          <p className={landing.lead}>
            Ekrandagi abakus haqiqiysidek: har bir qadam ko'rsatiladi, toshni bosib surish ham mumkin. Uyda
            ham bola darsdagi usulda hisoblaydi.
          </p>
        </Reveal>

        <Reveal index={1} className={styles.mode}>
          <SegmentedControl
            label="Abakus rejimi"
            appearance="pill"
            options={MODE_OPTIONS}
            value={mode}
            onChange={changeMode}
          />
        </Reveal>

        <CurriculumPlayer hidden={mode !== 'formulas'} />
        {gameOpened && <PlaceNumberGame hidden={mode !== 'free'} />}

        <Reveal as="ul" className={styles.chips} aria-label="Mashq sozlamalari">
          {PRACTICE_CHIPS.map((chip) => (
            <li key={chip} className={styles.chip}>
              {chip}
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
