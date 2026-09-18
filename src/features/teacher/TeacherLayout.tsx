import { Outlet } from 'react-router-dom';
import { useSession } from '@/shared/session/SessionContext';
import { type BottomNavItem, DashboardLayout } from '@/shared/ui/DashboardLayout';

const DESKTOP_TABS = [
  { to: '/teacher', label: "👥 O'quvchilar", end: true },
  { to: '/teacher/competition', label: '⚡ Musobaqa' },
  { to: '/teacher/stats', label: '📊 Statistika' },
  { to: '/teacher/classroom', label: '🏫 Sinf musobaqasi' },
  { to: '/teacher/market', label: "🎁 Do'kon" },
  { to: '/teacher/leaderboard', label: '🏆 Reyting' },
  { to: '/teacher/profile', label: '👤 Profil' },
];

const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  { to: '/teacher', label: "O'quvchilar", icon: '👥', end: true },
  { to: '/teacher/competition', label: 'Musobaqa', icon: '⚡' },
  { to: '/teacher/stats', label: 'Statistika', icon: '📊' },
  { to: '/teacher/profile', label: 'Profil', icon: '👤' },
];

export function TeacherLayout() {
  const { signOut } = useSession();

  return (
    <DashboardLayout
      title="Ustoz paneli"
      subtitle="Chaqqon-chaqqon"
      tabs={DESKTOP_TABS}
      bottomNavItems={BOTTOM_NAV_ITEMS}
      onLogout={signOut}
    >
      <Outlet />
    </DashboardLayout>
  );
}
