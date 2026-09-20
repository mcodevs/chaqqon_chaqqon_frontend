import { type ReactNode, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/shared/theme/ThemeToggle';
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
  /** Who is signed in — shown next to the sign-out button, not as the page title. */
  title: string;
  subtitle: string;
  tabs: readonly TabItem[];
  bottomNavItems?: readonly BottomNavItem[];
  actions?: ReactNode;
  onLogout: () => void;
  children: ReactNode;
}

/** Splits "👥 O'quvchilar" into its icon and its words; labels without one keep a default. */
function splitLabel(label: ReactNode): { icon: string; text: string } {
  if (typeof label !== 'string') return { icon: '•', text: '' };
  const [first, ...rest] = label.split(' ');
  // A leading emoji is never a word character, which is what tells the two apart.
  return /^\p{Extended_Pictographic}/u.test(first)
    ? { icon: first, text: rest.join(' ') }
    : { icon: '•', text: label };
}

function matches(pathname: string, to: string, end?: boolean) {
  return end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
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

  const navItems = useMemo(
    () =>
      tabs.map((tab) => {
        const { icon, text } = splitLabel(tab.label);
        return { to: tab.to, end: tab.end, icon, text };
      }),
    [tabs],
  );

  const bottomItems: readonly BottomNavItem[] =
    bottomNavItems ?? navItems.map(({ to, end, icon, text }) => ({ to, end, icon, label: text }));

  /*
   * The header names the page you are on, not the app — on a sub-page the app bar
   * turns into a back button instead, the way a native screen stack behaves.
   */
  const activeItem = navItems.find((item) => matches(location.pathname, item.to, item.end));
  const isSubPage = !activeItem;
  const pageTitle = activeItem?.text || title;

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <div className={styles.brand}>
            <div className={styles.brandLogo} aria-hidden="true">
              ⚡
            </div>
            <div className={styles.brandText}>
              <span className={styles.brandTitle}>Chaqqon</span>
              <span className={styles.brandSubtitle}>Mental arifmetika</span>
            </div>
          </div>
        </div>

        <nav className={styles.navMenu} aria-label="Asosiy bo'limlar">
          <ul className={styles.navList}>
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                >
                  <span className={styles.navIcon} aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className={styles.navLabel}>{item.text}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.sidebarFooter}>
          <ThemeToggle />
          <div className={styles.userCard}>
            <div className={styles.userAvatar} aria-hidden="true">
              {title.charAt(0)}
            </div>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{title}</span>
              <span className={styles.userRole}>{subtitle}</span>
            </div>
          </div>
          <Button variant="ghost" tone="neutral" size="sm" block onClick={onLogout}>
            Chiqish
          </Button>
        </div>
      </aside>

      <div className={styles.mainWrapper}>
        <header className={styles.desktopTopBar}>
          <h1 className={styles.pageTitle}>{pageTitle}</h1>
          {actions && <div className={styles.topBarActions}>{actions}</div>}
        </header>

        <header className={styles.mobileAppBar}>
          <div className={styles.mobileAppBarLeft}>
            {isSubPage ? (
              <button
                type="button"
                className={styles.mobileBackBtn}
                onClick={() => navigate(-1)}
                aria-label="Orqaga"
              >
                <span className={styles.mobileBackIcon} aria-hidden="true">
                  ‹
                </span>
                <span>Orqaga</span>
              </button>
            ) : (
              <span className={styles.mobileAppTitle}>{pageTitle}</span>
            )}
          </div>
          {actions && <div className={styles.mobileAppBarRight}>{actions}</div>}
        </header>

        <main className={styles.contentArea}>{children}</main>

        <nav className={styles.bottomNavBar} aria-label="Asosiy navigatsiya">
          <div className={styles.bottomNavContainer}>
            {bottomItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `${styles.bottomNavItem} ${isActive ? styles.bottomNavItemActive : ''}`
                }
              >
                <span className={styles.bottomNavIconWrap}>
                  <span className={styles.bottomNavIcon} aria-hidden="true">
                    {item.icon}
                  </span>
                  {item.badge && <span className={styles.bottomNavBadgeDot} />}
                </span>
                <span className={styles.bottomNavLabel}>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
