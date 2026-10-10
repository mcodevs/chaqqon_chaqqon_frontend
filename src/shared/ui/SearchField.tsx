import type { InputHTMLAttributes } from 'react';
import styles from './SearchField.module.css';

interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Read out instead of a visible label: the magnifier and the placeholder already say what it is. */
  label: string;
}

/**
 * A search box with no label above it, so it lines up with the buttons beside it.
 * Same height as a text field and a medium button.
 */
export function SearchField({ label, className, ...rest }: SearchFieldProps) {
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <span className={styles.icon} aria-hidden="true">
        🔍
      </span>
      <input type="search" aria-label={label} className={styles.input} {...rest} />
    </div>
  );
}
