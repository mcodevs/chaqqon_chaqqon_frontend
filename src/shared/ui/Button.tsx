import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import styles from './Button.module.css';
import { type Tone, toneColor } from './tone';

type Variant = 'solid' | 'soft' | 'outline';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  variant?: Variant;
  size?: 'md' | 'sm';
  block?: boolean;
}

export function Button({
  tone = 'coral',
  variant = 'solid',
  size = 'md',
  block = false,
  type = 'button',
  className,
  style,
  ...rest
}: ButtonProps) {
  const classes = [styles.button, styles[variant], styles[size], block && styles.block, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      style={{ '--button-color': toneColor(tone), ...style } as CSSProperties}
      {...rest}
    />
  );
}
