import { useId } from 'react';
import styles from './SliderField.module.css';

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  /** Shown after the label and read out by screen readers; the plain number by default. */
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
}

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  formatValue = String,
  onChange,
}: SliderFieldProps) {
  const id = useId();
  const text = formatValue(value);

  return (
    <div className={styles.block}>
      <label htmlFor={id} className={styles.label}>
        {label}: <b>{text}</b>
      </label>
      <input
        id={id}
        type="range"
        className={styles.slider}
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={text}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}
