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
  /** Adds − / + buttons, for a range too fine to hit accurately by dragging. */
  stepper?: boolean;
  onChange: (value: number) => void;
}

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  formatValue = String,
  stepper = false,
  onChange,
}: SliderFieldProps) {
  const id = useId();
  const text = formatValue(value);

  // Float steps drift (0.1 + 0.2), so each nudge is snapped back to the step grid.
  const nudge = (direction: 1 | -1) => {
    const next = Math.round((value + direction * step) / step) * step;
    onChange(Math.min(max, Math.max(min, next)));
  };

  const slider = (
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
  );

  return (
    <div className={styles.block}>
      <label htmlFor={id} className={styles.label}>
        {label}: <b>{text}</b>
      </label>
      {stepper ? (
        <div className={styles.sliderRow}>
          <button
            type="button"
            className={styles.stepBtn}
            onClick={() => nudge(-1)}
            disabled={value <= min}
            aria-label={`${label}: kamaytirish`}
          >
            −
          </button>
          {slider}
          <button
            type="button"
            className={styles.stepBtn}
            onClick={() => nudge(1)}
            disabled={value >= max}
            aria-label={`${label}: oshirish`}
          >
            +
          </button>
        </div>
      ) : (
        slider
      )}
    </div>
  );
}
