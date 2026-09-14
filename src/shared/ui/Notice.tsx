import type { ReactNode } from 'react';
import styles from './Notice.module.css';

export function ErrorMessage({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div role="alert" className={styles.error}>
      {children}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className={styles.empty}>{children}</p>;
}
