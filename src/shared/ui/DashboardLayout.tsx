import { type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Button } from './Button';
import type { TabItem } from './TabNav';
import styles from './DashboardLayout.module.css';

export interface BottomNavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
  badge?: boolean;
}

interface DashboardLayoutProps {
  title: string;
  subtitle: string;
  tabs: readonly TabItem[];
  bottomNavItems?: readonly BottomNavItem[];
  actions?: ReactNode;
  onLogout: () => void;
  children: ReactNode;
}

export function DashboardLayout({
  title,
  subtitle,
  tabs,
  bottomNavItems,
  actions,
  onLogout,
  children,
}: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  // Agar bottomNavItems berilmagan bo'lsa, tabs dan generatsiya qilamiz
  const navItems: readonly BottomNavItem[] =
    bottomNavItems ??
    tabs.map((tab) => {
      const labelStr = typeof tab.label === 'string' ? tab.label : '';
      const parts = labelStr.split(' ');
      const hasIcon = parts.length > 1;
      return {
        to: tab.to,
        label: hasIcon ? parts.slice(1).join(' ') : labelStr,
        icon: hasIcon ? parts[0] : '📌',
        end: tab.end,
      };
    });

  // Joriy sahifa asosiy bottom tablardan birortasi ekanligini tekshiramiz
  const isRootTab = navItems.some((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to) && item.to !== '/student' && item.to !== '/teacher',
  ) || location.pathname === '/student' || location.pathname === '/teacher';

  const isSubPage = !isRootTab;

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

        {/* Navigation items for Desktop */}
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
          <div className={styles.desktopTopBarActions}>{actions}</div>
        </header>

        {/* Mobile App Bar (Native ilova uslubidagi ixcham sarlavha) */}
        <header className={styles.mobileAppBar}>
          <div className={styles.mobileAppBarLeft}>
            {isSubPage ? (
              <button
                type="button"
                className={styles.mobileBackBtn}
                onClick={() => navigate(-1)}
                aria-label="Orqaga"
              >
                <span className={styles.mobileBackIcon}>‹</span>
                <span className={styles.mobileBackText}>Orqaga</span>
              </button>
            ) : (
              <div className={styles.mobileAppBrand}>
                <span className={styles.mobileAppLogo}>⚡</span>
                <div className={styles.mobileAppTitleWrap}>
                  <span className={styles.mobileAppTitle}>{title}</span>
                  <span className={styles.mobileAppSubtitle}>{subtitle}</span>
                </div>
              </div>
            )}
          </div>

          <div className={styles.mobileAppBarRight}>
            {actions}
          </div>
        </header>

        {/* Asosiy kontent maydoni */}
        <main className={styles.contentArea}>{children}</main>

        {/* 3. Mobile Bottom Navigation Bar (iOS / Android WebApp uslubi) */}
        <nav className={styles.bottomNavBar} aria-label="Asosiy navigatsiya">
          <div className={styles.bottomNavContainer}>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `${styles.bottomNavItem} ${isActive ? styles.bottomNavItemActive : ''}`
                }
              >
                <div className={styles.bottomNavIconWrap}>
                  <span className={styles.bottomNavIcon}>{item.icon}</span>
                  {item.badge && <span className={styles.bottomNavBadgeDot} />}
                </div>
                <span className={styles.bottomNavLabel}>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
