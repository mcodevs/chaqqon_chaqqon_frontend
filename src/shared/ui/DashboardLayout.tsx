import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Button } from './Button';
import type { TabItem } from './TabNav';
import styles from './DashboardLayout.module.css';

interface DashboardLayoutProps {
  title: string;
  subtitle: string;
  tabs: readonly TabItem[];
  actions?: ReactNode;
  onLogout: () => void;
  children: ReactNode;
}

export function DashboardLayout({
  title,
  subtitle,
  tabs,
  actions,
  onLogout,
  children,
}: DashboardLayoutProps) {
  return (
    <div className={styles.shell}>
      {/* 1. Desktop & Tablet Sidebar (>= 860px) */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.brand}>
            <div className={styles.brandLogo}>⚡</div>
            <div className={styles.brandText}>
              <span className={styles.brandTitle}>Chaqqon</span>
              <span className={styles.brandSubtitle}>Mental Arifmetika</span>
            </div>
          </div>
        </div>

        {/* User Card in Sidebar */}
        <div className={styles.userCard}>
          <div className={styles.userAvatar}>
            <span>{title.charAt(0) || '👤'}</span>
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{title}</span>
            <span className={styles.userRole}>{subtitle}</span>
          </div>
        </div>

        {/* Navigation items */}
        <nav className={styles.navMenu}>
          <div className={styles.navSectionLabel}>BO'LIMLAR</div>
          <ul className={styles.navList}>
            {tabs.map((tab) => (
              <li key={tab.to}>
                <NavLink
                  to={tab.to}
                  end={tab.end}
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`
                  }
                >
                  <span className={styles.navLabel}>{tab.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sidebar Footer Actions */}
        <div className={styles.sidebarFooter}>
          {actions && <div className={styles.sidebarActions}>{actions}</div>}
          <Button
            variant="outline"
            size="sm"
            block
            onClick={onLogout}
            className={styles.logoutBtn}
          >
            🚪 Chiqish
          </Button>
        </div>
      </aside>

      {/* 2. Main Viewport Area */}
      <div className={styles.mainWrapper}>
        {/* Desktop Top Bar */}
        <header className={styles.desktopTopBar}>
          <div>
            <h1 className={styles.pageTitle}>{title}</h1>
            <p className={styles.pageSubtitle}>{subtitle}</p>
          </div>
          <div className={styles.desktopTopBarActions}>
            {actions}
          </div>
        </header>

        {/* Mobile Top Header (Logotip, Ism, Actions & Chiqish) */}
        <header className={styles.mobileHeader}>
          <div className={styles.mobileHeaderLeft}>
            <span className={styles.mobileLogo}>⚡</span>
            <div className={styles.mobileTitleGroup}>
              <span className={styles.mobileTitle}>{title}</span>
              <span className={styles.mobileSubtitle}>{subtitle}</span>
            </div>
          </div>

          <div className={styles.mobileHeaderRight}>
            {actions}
            <button
              type="button"
              onClick={onLogout}
              className={styles.mobileLogoutBtn}
              title="Chiqish"
            >
              🚪
            </button>
          </div>
        </header>

        {/* Mobile Horizontal Sub-Navbar (Toza gorizontal navigatsiya) */}
        <nav className={styles.mobileNavBar}>
          <div className={styles.mobileNavScroll}>
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `${styles.mobileNavItem} ${isActive ? styles.mobileNavItemActive : ''}`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Asosiy kontent */}
        <main className={styles.contentArea}>
          {children}
        </main>
      </div>
    </div>
  );
}
