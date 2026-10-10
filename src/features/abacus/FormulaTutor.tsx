import { useMemo, useState } from 'react';
import { DEFAULT_RODS, problemFrames, signedText } from '@/domain/practice/abacus';
import { SECTION_IDS, type SectionId } from '@/domain/practice/config';
import { generateProblem } from '@/domain/practice/problem';
import { SECTION_META } from '@/features/practice/sections';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ChoiceField } from '@/shared/ui/ChoiceField';
import { numberChoices } from '@/shared/ui/choiceOptions';
import { Soroban } from '@/shared/ui/Soroban';
import styles from './Abacus.module.css';

const ROW_LIMITS = { min: 2, max: 6, step: 1 } as const;
const ROW_CHOICES = numberChoices(ROW_LIMITS);

const DEFAULT_SECTION: SectionId = 'kichik';
const DEFAULT_ROW_COUNT = 3;

function drawProblem(section: SectionId, rowCount: number) {
  return generateProblem({ section, rowCount, digitCount: 1 }, Math.random);
}

export function FormulaTutor() {
  const [section, setSection] = useState(DEFAULT_SECTION);
  const [rowCount, setRowCount] = useState(DEFAULT_ROW_COUNT);
  const [problem, setProblem] = useState(() => drawProblem(DEFAULT_SECTION, DEFAULT_ROW_COUNT));
  const [index, setIndex] = useState(0);

  const frames = useMemo(() => problemFrames(problem.numbers, DEFAULT_RODS), [problem]);
  const frame = frames[Math.min(index, frames.length - 1)];
  const finished = index >= frames.length - 1;

  /** Any change of setting starts a fresh example from the first bead. */
  const restart = (nextSection: SectionId, nextRowCount: number) => {
    setSection(nextSection);
    setRowCount(nextRowCount);
    setProblem(drawProblem(nextSection, nextRowCount));
    setIndex(0);
  };

  return (
    <>
      <Card title="Formulani abakusda ko'ring">
        <div className={styles.stage}>
          <div className={styles.moves}>
            {problem.numbers.map((value, row) => (
              <span
                key={row}
                className={[
                  styles.move,
                  row === frame.row && styles.moveCurrent,
                  row < frame.row && styles.moveDone,
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {row === 0 ? value : signedText(value)}
              </span>
            ))}
          </div>

          <Soroban value={frame.value} rods={DEFAULT_RODS} highlight={frame.column} size="lg" />

          <div className={styles.step}>
            <p className={styles.caption}>{frame.header}</p>
            {frame.formula && <span className={styles.formula}>{frame.formula}</span>}
            <p className={styles.stepText} role="status">
              {frame.text}
            </p>
          </div>

          {finished && (
            <div className={styles.answer}>
              <span aria-hidden="true">✓</span>
              Javob: {problem.answer}
            </div>
          )}

          <p className={styles.progress}>
            Qadam {Math.min(index, frames.length - 1) + 1} / {frames.length}
          </p>

          <div className={styles.actions}>
            <Button
              variant="outline"
              tone="neutral"
              onClick={() => setIndex(index - 1)}
              disabled={index === 0}
            >
              Orqaga
            </Button>
            {finished ? (
              <Button size="lg" onClick={() => restart(section, rowCount)}>
                Yangi misol
              </Button>
            ) : (
              <Button size="lg" onClick={() => setIndex(index + 1)}>
                Keyingi qadam
              </Button>
            )}
            <Button variant="ghost" tone="neutral" onClick={() => setIndex(0)} disabled={index === 0}>
              Boshidan
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Sozlash">
        <div className={styles.fieldBlock}>
          <label className={styles.fieldLabel} htmlFor="abacus-section">
            Bo'lim
          </label>
          <select
            id="abacus-section"
            className={styles.select}
            value={section}
            onChange={(event) => restart(event.target.value as SectionId, rowCount)}
          >
            {SECTION_IDS.map((id) => (
              <option key={id} value={id}>
                {SECTION_META[id].label} — {SECTION_META[id].description}
              </option>
            ))}
          </select>
        </div>

        <ChoiceField
          label="Qator soni (necha son)"
          options={ROW_CHOICES}
          value={rowCount}
          onChange={(next) => restart(section, next)}
        />
      </Card>
    </>
  );
}
