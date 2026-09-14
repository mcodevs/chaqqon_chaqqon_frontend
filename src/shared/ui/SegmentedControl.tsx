import styles from './SegmentedControl.module.css';

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string | number> {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  appearance?: 'pill' | 'boxed';
}

export function SegmentedControl<T extends string | number>({
  label,
  options,
  value,
  onChange,
  appearance = 'boxed',
}: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={`${styles.group} ${styles[appearance]}`}>
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
  );
}
