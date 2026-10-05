import { type FormEvent, useRef, useState } from 'react';
import type { PracticeKind } from '@/domain/practice/config';
import type { Problem } from '@/domain/practice/problem';
import { useKeepFocus } from '@/shared/hooks/useKeepFocus';
import { Button } from '@/shared/ui/Button';
import styles from '../Practice.module.css';
import { ColumnProblem } from './ColumnProblem';

interface AnswerViewProps {
  kind: PracticeKind;
  problemNumber: number;
  problemCount: number;
  /** The column drill answers the problem while it is still on screen, so it needs it here. */
  problem?: Problem;
  onSubmit: (answer: number) => void;
}

export function AnswerView({ kind, problemNumber, problemCount, problem, onSubmit }: AnswerViewProps) {
  const isCard = kind === 'soroban';
  const column = kind === 'ustun' ? problem : undefined;
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  useKeepFocus(() => input.current);
  const answer = value.trim() === '' ? null : Number(value);
  const isValid = answer !== null && Number.isFinite(answer);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isValid) onSubmit(answer);
  };

  return (
    <form className={styles.stage} onSubmit={handleSubmit}>
      <label htmlFor="practice-answer" className={styles.progress}>
        {isCard ? 'Karta' : 'Misol'} {problemNumber}/{problemCount} ·{' '}
        {isCard ? 'Abakusda qaysi son turgan edi?' : "Jami nechchi bo'ldi?"}
      </label>
      {column && <ColumnProblem problem={column} />}
      <input
        id="practice-answer"
        ref={input}
        className={styles.answerInput}
        type="number"
        inputMode="numeric"
        placeholder="?"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <Button type="submit" size="lg" block disabled={!isValid}>
        Javobni yuborish
      </Button>
    </form>
  );
}
