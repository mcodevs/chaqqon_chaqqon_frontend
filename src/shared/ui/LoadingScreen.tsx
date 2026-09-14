import { DigitCharacter } from './DigitCharacter';
import styles from './LoadingScreen.module.css';

export function LoadingScreen({ label = 'Yuklanmoqda...' }: { label?: string }) {
  return (
    <div className={styles.screen} role="status">
      <DigitCharacter digit={7} size={64} animated />
      <span className={styles.label}>{label}</span>
    </div>
  );
}
