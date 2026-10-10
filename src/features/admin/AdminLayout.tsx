import { Outlet } from 'react-router-dom';
import { useSession } from '@/shared/session/SessionContext';
import { DashboardLayout } from '@/shared/ui/DashboardLayout';

const TABS = [
  { to: '/admin', label: '📊 Statistika', end: true },
  { to: '/admin/teachers', label: '👩‍🏫 Ustozlar' },
  { to: '/admin/finance', label: '💳 Moliya' },
  { to: '/admin/tariffs', label: '🏷️ Tariflar' },
  { to: '/admin/settings', label: '⚙️ Sozlamalar' },
];

/** The superadmin's panel: teachers, money and the platform's settings. */
export function AdminLayout() {
  const { signOut } = useSession();

  return (
    <DashboardLayout
      title="Administrator"
      subtitle="Chaqqon-chaqqon platformasi"
      tabs={TABS}
      onLogout={signOut}
    >
      <Outlet />
    </DashboardLayout>
  );
}
