import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import styles from './TabNav.module.css';

export interface TabItem {
  to: string;
  label: ReactNode;
  /** Match the path exactly (for index routes). */
  end?: boolean;
}

export function TabNav({ items }: { items: readonly TabItem[] }) {
  return (
    <nav className={styles.tabs}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
