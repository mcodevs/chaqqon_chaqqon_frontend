import { type KeyboardEvent, type MouseEvent, useId, useRef, useState } from 'react';
import type { Student } from '@/domain/users';
import { useKeepFocus } from '@/shared/hooks/useKeepFocus';
import { Button } from '@/shared/ui/Button';
import styles from './Classroom.module.css';
import { LanePanel } from './LanePanel';

interface AnswerRoundProps {
  participants: readonly Student[];
  correctSoFar: readonly number[];
  onSubmit: (answers: (number | null)[]) => void;
}

/** The teacher types what each student says. Enter moves to the next panel and, on the last one, checks all. */
export function AnswerRound({ participants, correctSoFar, onSubmit }: AnswerRoundProps) {
  const idPrefix = useId();
  const [values, setValues] = useState(() => participants.map(() => ''));
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  /** The panel being filled in, so focus comes back to it and not to the first one. */
  const activeLane = useRef(0);

  useKeepFocus(() => inputs.current[activeLane.current] ?? inputs.current[0]);

  const submit = () => onSubmit(values.map((value) => (value === '' ? null : Number(value))));

  const handleKeyDown = (lane: number) => (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const nextInput = inputs.current[lane + 1];
    if (nextInput) nextInput.focus();
    else submit();
  };

  /**
   * A panel is a big target and its input a small one. Clicking anywhere on the panel aims at
   * that panel's field instead of dropping focus, which is what the teacher meant anyway.
   */
  const handlePanelMouseDown = (lane: number) => (event: MouseEvent<HTMLElement>) => {
    if (event.target instanceof HTMLElement && event.target.closest('input, button, a, [tabindex]')) {
      return;
    }
    event.preventDefault();
    inputs.current[lane]?.focus();
  };

  return (
    <>
      <div className={styles.grid} data-lanes={participants.length}>
        {participants.map((student, lane) => {
          const inputId = `${idPrefix}-${lane}`;
          return (
            <LanePanel
              key={student.id}
              name={student.firstName}
              correct={correctSoFar[lane]}
              onMouseDown={handlePanelMouseDown(lane)}
            >
              <label htmlFor={inputId} className={styles.answerLabel}>
                {student.firstName}ning javobi
              </label>
              <input
                id={inputId}
                ref={(element) => {
                  inputs.current[lane] = element;
                }}
                className={styles.answerInput}
                inputMode="numeric"
                autoComplete="off"
                placeholder="?"
                value={values[lane]}
                onFocus={() => {
                  activeLane.current = lane;
                }}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, '');
                  setValues((current) => current.with(lane, digits));
                }}
                onKeyDown={handleKeyDown(lane)}
              />
            </LanePanel>
          );
        })}
      </div>
      <footer className={styles.controls}>
        <span className={styles.controlsHint}>Bo'sh qoldirilgan javob noto'g'ri hisoblanadi</span>
        <Button onClick={submit}>Tekshirish</Button>
      </footer>
    </>
  );
}
