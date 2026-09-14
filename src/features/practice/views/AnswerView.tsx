import { type FormEvent, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import styles from '../Practice.module.css';

interface AnswerViewProps {
  problemNumber: number;
  problemCount: number;
  onSubmit: (answer: number) => void;
}

export function AnswerView({ problemNumber, problemCount, onSubmit }: AnswerViewProps) {
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
        Misol {problemNumber}/{problemCount} · Jami nechchi bo'ldi?
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
      <Button type="submit" tone="green" block disabled={!isValid}>
        Javobni yuborish
      </Button>
    </form>
  );
}
