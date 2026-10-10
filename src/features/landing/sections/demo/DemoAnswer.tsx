import { type FormEvent, type RefObject, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/shared/ui/Button';
import motion from '../../motion/motion.module.css';
import { prefersReducedMotion } from '../../motion/usePrefersReducedMotion';
import styles from './DemoStage.module.css';

interface DemoAnswerProps {
  /** Centred on screen when the answer is asked for, so the field and its button are both in view. */
  stageRef: RefObject<HTMLElement | null>;
  onSubmit: (answer: number) => void;
  onShowAgain: () => void;
}

/**
 * "Jami nechchi bo'ldi?": the demo's own small form, not the practice AnswerView. That one keeps
 * pulling focus back to its field, which on a landing page would trap a visitor who only wanted to
 * click elsewhere; this one places focus once, when the last number is gone (and only if the visitor
 * has not moved on), and then leaves it be.
 */
export function DemoAnswer({ stageRef, onSubmit, onShowAgain }: DemoAnswerProps) {
  const id = useId();
  const field = useRef<HTMLInputElement>(null);
  const placed = useRef(false);
  const [text, setText] = useState('');

  // Empty, "-" or "e" leave a number field's value blank: only a typed number arms Tekshirish.
  const answer = text.trim() === '' ? null : Number(text);
  const ready = answer !== null && Number.isFinite(answer);

  useEffect(() => {
    if (placed.current) return;
    placed.current = true;
    // A timer brings this step, not a press, so it claims the screen only if the visitor stayed: the
    // focused flash group is gone by now (focus fell to body), while a Tab or click elsewhere keeps its place.
    const active = document.activeElement;
    const stayed = !active || active === document.body || !!stageRef.current?.contains(active);
    if (!stayed) return;
    stageRef.current?.scrollIntoView({
      block: 'center',
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
    // On iOS a focus that no tap started does not open the keyboard; the visitor taps the field then.
    field.current?.focus({ preventScroll: true });
  }, [stageRef]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (answer !== null && Number.isFinite(answer)) onSubmit(answer);
  };

  return (
    // noValidate: a browser bubble ("enter a whole number") must never stand between Enter and the verdict.
    <form className={`${styles.answer} ${motion.rise}`} onSubmit={submit} noValidate>
      <label htmlFor={id} className={styles.answerLabel}>
        Jami nechchi bo'ldi?
      </label>
      <div className={styles.answerRow}>
        <input
          ref={field}
          id={id}
          className={styles.answerInput}
          type="number"
          inputMode="numeric"
          enterKeyHint="done"
          autoComplete="off"
          placeholder="?"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <Button type="submit" size="lg" disabled={!ready}>
          Tekshirish
        </Button>
      </div>
      <Button variant="ghost" tone="neutral" onClick={onShowAgain}>
        Qaytadan ko'rsatish
      </Button>
    </form>
  );
}
