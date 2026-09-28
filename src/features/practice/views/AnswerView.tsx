import { type FormEvent, useState } from 'react';
import type { PracticeKind } from '@/domain/practice/config';
import { Button } from '@/shared/ui/Button';
import styles from '../Practice.module.css';

interface AnswerViewProps {
  kind: PracticeKind;
  problemNumber: number;
  problemCount: number;
  onSubmit: (answer: number) => void;
}

export function AnswerView({ kind, problemNumber, problemCount, onSubmit }: AnswerViewProps) {
  const isCard = kind === 'soroban';
  const [value, setValue] = useState('');
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
      <input
        id="practice-answer"
        className={styles.answerInput}
        type="number"
        inputMode="numeric"
        autoFocus
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
