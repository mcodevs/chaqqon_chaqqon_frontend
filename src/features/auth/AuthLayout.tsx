import type { ReactNode } from 'react';
import { DigitCharacter } from '@/shared/ui/DigitCharacter';
import styles from './AuthLayout.module.css';

const FLOATING_DIGITS = [3, 7, 1, 9, 5, 2];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.wrap}>
      <div className={styles.floating} aria-hidden="true">
        {FLOATING_DIGITS.map((digit, index) => (
          <div key={index} className={`${styles.floatItem} ${styles[`float${index}`]}`}>
            <DigitCharacter digit={digit} size={46 + (index % 3) * 10} />
          </div>
        ))}
      </div>
      <main className={styles.card}>
        <h1 className={styles.brand}>Chaqqon-chaqqon</h1>
        <p className={styles.brandSub}>Mental arifmetika · Mohira ustoz bilan</p>
        {children}
      </main>
    </div>
  );
}
