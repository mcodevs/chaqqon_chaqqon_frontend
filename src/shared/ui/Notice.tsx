import type { ReactNode } from 'react';
import styles from './Notice.module.css';

export function ErrorMessage({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <div role="alert" className={styles.error}>
      <span aria-hidden="true">⚠️</span>
      <span>{children}</span>
    </div>
  );
}

interface EmptyStateProps {
  children?: ReactNode;
  /** Shown above the text; a short symbol, never a sentence. */
  icon?: string;
  title?: string;
  /** What the user can do about it — an empty screen should never be a dead end. */
  action?: ReactNode;
}

/**
 * With only `children` this is the old one-line note. With a title it becomes a
 * proper empty state: what is missing, and what to do next.
 */
export function EmptyState({ children, icon, title, action }: EmptyStateProps) {
  if (!title && !icon && !action) return <p className={styles.empty}>{children}</p>;

  return (
    <div className={styles.emptyBlock}>
      {icon && (
        <span className={styles.emptyIcon} aria-hidden="true">
          {icon}
        </span>
      )}
      {title && <p className={styles.emptyTitle}>{title}</p>}
      {children && <p className={styles.emptyText}>{children}</p>}
      {action}
    </div>
  );
}
