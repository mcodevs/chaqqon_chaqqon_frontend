import { Outlet } from 'react-router-dom';
import { useSession } from '@/shared/session/SessionContext';
import { DashboardLayout } from '@/shared/ui/DashboardLayout';

const TABS = [
  { to: '/teacher', label: "O'quvchilar", end: true },
  { to: '/teacher/market', label: "Do'kon" },
  { to: '/teacher/stats', label: 'Statistika' },
  { to: '/teacher/leaderboard', label: 'Reyting' },
  { to: '/teacher/competition', label: 'Musobaqa' },
  { to: '/teacher/classroom', label: 'Sinf musobaqasi' },
];

export function TeacherLayout() {
  const { signOut } = useSession();

  return (
    <DashboardLayout title="Ustoz paneli" subtitle="Chaqqon-chaqqon" tabs={TABS} onLogout={signOut}>
      <Outlet />
    </DashboardLayout>
  );
}
