import type { ReactNode } from 'react';
import { Button } from './Button';
import styles from './DashboardLayout.module.css';
import { type TabItem, TabNav } from './TabNav';

interface DashboardLayoutProps {
  title: string;
  subtitle: string;
  tabs: readonly TabItem[];
  onLogout: () => void;
  children: ReactNode;
}

export function DashboardLayout({ title, subtitle, tabs, onLogout, children }: DashboardLayoutProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          <div className={styles.subtitle}>{subtitle}</div>
        </div>
        <Button variant="outline" size="sm" onClick={onLogout}>
          Chiqish
        </Button>
      </header>
      <TabNav items={tabs} />
      <main className={styles.content}>{children}</main>
    </div>
  );
}
