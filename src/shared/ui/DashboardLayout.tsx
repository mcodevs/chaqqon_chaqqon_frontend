import { useState, type ReactNode } from 'react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className={styles.shell}>
      {/* 1. Desktop & Tablet Sidebar */}
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

      {/* 2. Mobile Top Navigation Bar */}
      <div className={styles.mobileBar}>
        <div className={styles.mobileBrand}>
          <span className={styles.mobileLogo}>⚡</span>
          <span className={styles.mobileTitle}>{title}</span>
        </div>

        <div className={styles.mobileRight}>
          {actions && <div className={styles.mobileActions}>{actions}</div>}
          <button
            type="button"
            className={styles.menuToggleBtn}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menyuni ochish"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* 3. Mobile Backdrop Drawer */}
      {mobileMenuOpen && (
        <div className={styles.mobileDrawerOverlay} onClick={closeMobileMenu}>
          <div
            className={styles.mobileDrawer}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.drawerHeader}>
              <div className={styles.brand}>
                <div className={styles.brandLogo}>⚡</div>
                <div>
                  <div className={styles.brandTitle}>{title}</div>
                  <div className={styles.brandSubtitle}>{subtitle}</div>
                </div>
              </div>
              <button
                type="button"
                className={styles.drawerCloseBtn}
                onClick={closeMobileMenu}
              >
                ✕
              </button>
            </div>

            <nav className={styles.drawerNav}>
              {tabs.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.end}
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `${styles.drawerLink} ${isActive ? styles.drawerLinkActive : ''}`
                  }
                >
                  {tab.label}
                </NavLink>
              ))}
            </nav>

            <div className={styles.drawerFooter}>
              <Button variant="outline" block onClick={onLogout}>
                🚪 Chiqish
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Main Viewport Area */}
      <div className={styles.mainWrapper}>
        <header className={styles.desktopTopBar}>
          <div>
            <h1 className={styles.pageTitle}>{title}</h1>
            <p className={styles.pageSubtitle}>{subtitle}</p>
          </div>
          <div className={styles.desktopTopBarActions}>
            {actions}
          </div>
        </header>

        <main className={styles.contentArea}>
          {children}
        </main>
      </div>
    </div>
  );
}
