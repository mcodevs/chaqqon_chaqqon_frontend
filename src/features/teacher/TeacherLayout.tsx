import { Outlet } from 'react-router-dom';
import { type Feature, hasFeature, isLocked } from '@/domain/teacherBilling';
import { useMyFeatures, useTeacherAccount } from '@/shared/services/queries';
import { useSession } from '@/shared/session/SessionContext';
import { type BottomNavItem, DashboardLayout } from '@/shared/ui/DashboardLayout';
import { LoadingScreen } from '@/shared/ui/LoadingScreen';
import { SubscriptionBanner } from './subscription/SubscriptionBanner';
import { TeacherBlockedPage } from './subscription/TeacherBlockedPage';

/** A section only some tariffs open says which feature it needs; the rest are always there. */
type Section<T> = T & { feature?: Feature };

const DESKTOP_TABS: Section<{ to: string; label: string; end?: boolean }>[] = [
  { to: '/teacher', label: "👥 O'quvchilar", end: true },
  { to: '/teacher/competition', label: '📝 Interaktiv vazifalar', feature: 'homework_rooms' },
  { to: '/teacher/stats', label: '📊 Statistika', feature: 'stats' },
  { to: '/teacher/worksheet', label: '🖨️ Yozma vazifa', feature: 'worksheet' },
  { to: '/teacher/classroom', label: '🏫 Sinf musobaqasi', feature: 'classroom' },
  { to: '/teacher/abacus', label: '🧮 Abakus' },
  { to: '/teacher/market', label: "🎁 Do'kon", feature: 'market' },
  { to: '/teacher/leaderboard', label: '🏆 Reyting', feature: 'leaderboard' },
  { to: '/teacher/profile', label: '👤 Profil' },
];

const ABACUS_NAV_ITEM: BottomNavItem = { to: '/teacher/abacus', label: 'Abakus', icon: '🧮' };

const BOTTOM_NAV_ITEMS: Section<BottomNavItem>[] = [
  { to: '/teacher', label: "O'quvchilar", icon: '👥', end: true },
  { to: '/teacher/competition', label: 'Uy vazifasi', icon: '📝', feature: 'homework_rooms' },
  { to: '/teacher/stats', label: 'Statistika', icon: '📊', feature: 'stats' },
  { to: '/teacher/profile', label: 'Profil', icon: '👤' },
];

export function TeacherLayout() {
  const { signOut } = useSession();
  const account = useTeacherAccount();
  const features = useMyFeatures();

  if (!account || !features) return <LoadingScreen />;
  if (isLocked(account.billing.status)) return <TeacherBlockedPage account={account} onLogout={signOut} />;

  const open = <T,>(sections: Section<T>[]) =>
    sections.filter((section) => !section.feature || hasFeature(features, section.feature));
  const name = `${account.firstName} ${account.lastName}`.trim() || account.username;
  // A small tariff leaves room in the bottom bar; the abacus takes it, just before the profile.
  const bottomNav = open(BOTTOM_NAV_ITEMS);
  if (bottomNav.length < 4) bottomNav.splice(bottomNav.length - 1, 0, ABACUS_NAV_ITEM);

  return (
    <DashboardLayout
      title={name}
      subtitle={account.centerName || 'Ustoz paneli'}
      tabs={open(DESKTOP_TABS)}
      bottomNavItems={bottomNav}
      onLogout={signOut}
    >
      <SubscriptionBanner account={account} />
      <Outlet />
    </DashboardLayout>
  );
}
