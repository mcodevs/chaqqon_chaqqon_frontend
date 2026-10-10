import { Outlet } from 'react-router-dom';
import { useApplications } from '@/shared/services/queries';
import { useSession } from '@/shared/session/SessionContext';
import { type BottomNavItem, DashboardLayout } from '@/shared/ui/DashboardLayout';

/** The superadmin's panel: teachers, applications, money and the platform's settings. */
export function AdminLayout() {
  const { signOut } = useSession();
  const applications = useApplications();
  const waiting = applications?.filter((a) => a.status === 'new').length ?? 0;

  const tabs = [
    { to: '/admin', label: '📊 Statistika', end: true },
    { to: '/admin/applications', label: waiting > 0 ? `📝 Arizalar (${waiting})` : '📝 Arizalar' },
    { to: '/admin/teachers', label: '👩‍🏫 Ustozlar' },
    { to: '/admin/finance', label: '💳 Moliya' },
    { to: '/admin/tariffs', label: '🏷️ Tariflar' },
    { to: '/admin/settings', label: '⚙️ Sozlamalar' },
  ];
  // Tariffs are reached from the settings page on a phone, where the bar holds five.
  const bottomNav: BottomNavItem[] = [
    { to: '/admin', label: 'Statistika', icon: '📊', end: true },
    { to: '/admin/applications', label: 'Arizalar', icon: '📝', badge: waiting > 0 },
    { to: '/admin/teachers', label: 'Ustozlar', icon: '👩‍🏫' },
    { to: '/admin/finance', label: 'Moliya', icon: '💳' },
    { to: '/admin/settings', label: 'Sozlamalar', icon: '⚙️' },
  ];

  return (
    <DashboardLayout
      title="Administrator"
      subtitle="Chaqqon-chaqqon platformasi"
      tabs={tabs}
      bottomNavItems={bottomNav}
      onLogout={signOut}
    >
      <Outlet />
    </DashboardLayout>
  );
}
