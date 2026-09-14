import type { CSSProperties } from 'react';
import styles from './DigitCharacter.module.css';

const DIGIT_PALETTE: readonly { light: string; dark: string }[] = [
  { light: '#FF6B6B', dark: '#D6473F' },
  { light: '#FFA94D', dark: '#E07E1F' },
  { light: '#FFD93D', dark: '#D9AE12' },
  { light: '#6BCB77', dark: '#3EA24C' },
  { light: '#4D9DE0', dark: '#2777B8' },
  { light: '#9B5DE5', dark: '#7134BA' },
  { light: '#F15BB5', dark: '#C82F8C' },
  { light: '#00BBF9', dark: '#0090C4' },
  { light: '#FF6F91', dark: '#D8426A' },
  { light: '#43AA8B', dark: '#237F63' },
];

interface DigitCharacterProps {
  digit: number;
  size?: number;
  animated?: boolean;
}

/** Friendly smiling-digit mascot used for avatars and decoration. */
export function DigitCharacter({ digit, size = 54, animated = false }: DigitCharacterProps) {
  const index = ((Math.trunc(digit) % 10) + 10) % 10;
  const { light, dark } = DIGIT_PALETTE[index];

  const style = {
    '--size': `${size}px`,
    '--light': light,
    '--dark': dark,
  } as CSSProperties;

  return (
    <div
      className={`${styles.character} ${animated ? styles.animated : ''}`}
      style={style}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" className={styles.face}>
        <circle cx="34" cy="42" r="6" fill="#22242b" />
        <circle cx="66" cy="42" r="6" fill="#22242b" />
        <circle cx="36" cy="40" r="2" fill="#fff" />
        <circle cx="68" cy="40" r="2" fill="#fff" />
        <path d="M36 60 Q50 72 64 60" stroke="#22242b" strokeWidth="5" fill="none" strokeLinecap="round" />
      </svg>
      <span className={styles.number}>{index}</span>
    </div>
  );
}
