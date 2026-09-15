import type { ReactNode } from 'react';
import { Button } from './Button';
import styles from './DashboardLayout.module.css';
import { type TabItem, TabNav } from './TabNav';

interface DashboardLayoutProps {
  title: string;
  subtitle: string;
  tabs: readonly TabItem[];
  actions?: ReactNode;
  onLogout: () => void;
  children: ReactNode;
}

export function DashboardLayout({ title, subtitle, tabs, actions, onLogout, children }: DashboardLayoutProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          <div className={styles.subtitle}>{subtitle}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {actions}
          <Button variant="outline" size="sm" onClick={onLogout}>
            Chiqish
          </Button>
        </div>
      </header>
      {tabs.length > 0 && <TabNav items={tabs} />}
      <main className={styles.content}>{children}</main>
    </div>
  );
}
