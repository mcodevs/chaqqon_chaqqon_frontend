import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import styles from './Button.module.css';
import { type Tone, toneColor, toneContentColor, toneSoftColor } from './tone';

/**
 * `primary` is the one action a screen is about — at most one per view.
 * `secondary` is a tinted alternative, `outline` a bordered one, `ghost` a quiet
 * text action. `solid` and `soft` are the old names, kept so older screens still build.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'solid' | 'soft';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'primary',
  solid: 'primary',
  secondary: 'secondary',
  soft: 'secondary',
  outline: 'outline',
  ghost: 'ghost',
};

export function Button({
  tone = 'brand',
  variant = 'primary',
  size = 'md',
  block = false,
  type = 'button',
  className,
  style,
  ...rest
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[VARIANT_CLASS[variant]],
    styles[size],
    block && styles.block,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      style={
        {
          '--button-color': toneColor(tone),
          '--button-soft': toneSoftColor(tone),
          '--button-content': toneContentColor(tone),
          ...style,
        } as CSSProperties
      }
      {...rest}
    />
  );
}
