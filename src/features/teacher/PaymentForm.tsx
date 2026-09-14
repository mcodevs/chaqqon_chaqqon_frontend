import { type FormEvent, useId, useState } from 'react';
import {
  type CalendarDate,
  MAX_PREPAID_MONTHS,
  type StudentAccess,
  addDays,
  addMonths,
  isValidPaidUntil,
  suggestPaidUntil,
} from '@/domain/billing';
import { formatCalendarDate } from '@/shared/format';
import { Button } from '@/shared/ui/Button';
import styles from './Teacher.module.css';

/** Students often pay a few months ahead. */
const QUICK_MONTHS = [1, 2, 3, 4] as const;

interface PaymentFormProps {
  firstName: string;
  access: StudentAccess;
  today: CalendarDate;
  pending: boolean;
  onSave: (paidUntil: CalendarDate) => void;
  onCancel: () => void;
}

/** "To'ladi": the teacher sets the day the student's access ends, typing it or counting months. */
export function PaymentForm({ firstName, access, today, pending, onSave, onCancel }: PaymentFormProps) {
  const dateId = useId();
  const [paidUntil, setPaidUntil] = useState(() => suggestPaidUntil(access.paidUntil, today, 1));
  const valid = isValidPaidUntil(paidUntil, today);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (valid) onSave(paidUntil);
  };

  return (
    <form className={styles.paymentForm} onSubmit={submit} noValidate>
      <label htmlFor={dateId} className={styles.paymentTitle}>
        {firstName} qaysi sanagacha ochiq bo'lsin?
      </label>
      <div className={styles.monthChoices} role="group" aria-label="Necha oyga to'landi">
        {QUICK_MONTHS.map((months) => {
          const date = suggestPaidUntil(access.paidUntil, today, months);
          return (
            <button
              key={months}
              type="button"
              className={styles.monthChoice}
              aria-pressed={date === paidUntil}
              onClick={() => setPaidUntil(date)}
            >
              {months} oy
            </button>
          );
        })}
      </div>
      <input
        id={dateId}
        type="date"
        className={styles.dateInput}
        value={paidUntil}
        min={addDays(today, 1)}
        max={addMonths(today, MAX_PREPAID_MONTHS)}
        onChange={(event) => setPaidUntil(event.target.value)}
      />
      <p className={valid ? styles.paymentHint : `${styles.paymentHint} ${styles.accessClosed}`}>
        {valid
          ? `Profil ${formatCalendarDate(paidUntil)} kuni yopiladi.`
          : `Ertangi kundan ${MAX_PREPAID_MONTHS} oygacha bo'lgan sanani tanlang.`}
      </p>
      <div className={styles.buttonRow}>
        <Button type="submit" size="sm" tone="green" disabled={!valid || pending}>
          Saqlash
        </Button>
        <Button size="sm" variant="soft" tone="coral" onClick={onCancel}>
          Bekor
        </Button>
      </div>
    </form>
  );
}
