import { useId } from 'react';
import styles from './ChoiceField.module.css';
import type { ChoiceOption } from './choiceOptions';

interface ChoiceFieldProps<T extends string | number> {
  label: string;
  options: readonly ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * A labelled row of chips, for a setting with only a handful of values. A slider makes the reader
 * aim at a number they cannot see beforehand; here every choice is visible and one tap wide.
 */
export function ChoiceField<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: ChoiceFieldProps<T>) {
  const labelId = useId();

  return (
    <div className={styles.block}>
      <span className={styles.label} id={labelId}>
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={labelId} className={styles.options}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            className={styles.option}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
