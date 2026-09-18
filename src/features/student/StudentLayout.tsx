import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { accessOf } from '@/domain/billing';
import {
  usePayments,
  useSchoolToday,
  useStudentRoom,
  useStudentStars,
  useStudents,
} from '@/shared/services/queries';
import { useSession } from '@/shared/session/SessionContext';
import { type BottomNavItem, DashboardLayout } from '@/shared/ui/DashboardLayout';
import { LoadingScreen } from '@/shared/ui/LoadingScreen';
import { ClosedAccountPage } from './ClosedAccountPage';
import { CurrentStudentContext } from './CurrentStudentContext';

export function StudentLayout() {
  const { session, signOut } = useSession();
  const students = useStudents();
  const payments = usePayments();
  const today = useSchoolToday();
  const studentId = session?.role === 'student' ? session.studentId : null;
  const snapshot = useStudentRoom(studentId ?? '');
  const stars = useStudentStars(studentId ?? '');
  const student = students?.find((s) => s.id === studentId) ?? null;
  const accountDeleted = students !== undefined && student === null;

  useEffect(() => {
    if (accountDeleted) signOut();
  }, [accountDeleted, signOut]);

  if (!student || !payments) return <LoadingScreen />;

  const access = accessOf(payments, student.id, today);
  if (!access.open) {
    return <ClosedAccountPage student={student} paidUntil={access.paidUntil} onLogout={signOut} />;
  }

  const hasPendingCompetition =
    snapshot?.room?.participantIds.includes(student.id) === true && !snapshot.progress[student.id]?.finished;

  // Desktop sidebar uchun to'liq bo'limlar
  const tabs = [
    { to: '/student', label: '🧮 Mashq', end: true },
    { to: '/student/competition', label: hasPendingCompetition ? '⚡ Musobaqa •' : '⚡ Musobaqa' },
    { to: '/student/leaderboard', label: '🏆 Reyting' },
    { to: '/student/results', label: '📈 Natijalarim' },
    { to: '/student/market', label: "🎁 Do'kon" },
    { to: '/student/profile', label: '👤 Profil' },
  ];

  // Mobile Bottom Navigation Bar uchun eng asosiy 4 ta bo'lim
  const bottomNavItems: BottomNavItem[] = [
    { to: '/student', label: 'Mashq', icon: '🧮', end: true },
    { to: '/student/competition', label: 'Musobaqa', icon: '⚡', badge: hasPendingCompetition },
    { to: '/student/leaderboard', label: 'Reyting', icon: '🏆' },
    { to: '/student/profile', label: 'Profil', icon: '👤' },
  ];

  const starsBadge = (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: 'var(--color-surface)',
        border: '2px solid var(--color-yellow)',
        padding: '5px 10px',
        borderRadius: '12px',
        fontWeight: 800,
        fontSize: '13px',
        color: '#b38100',
        boxShadow: '0 2px 8px rgba(255, 217, 61, 0.25)',
      }}
      title="Yulduzchalaringiz balansi"
    >
      <span>⭐</span>
      <span>{stars?.balance ?? 0}</span>
    </div>
  );

  return (
    <CurrentStudentContext.Provider value={student}>
      <DashboardLayout
        title={`Salom, ${student.firstName}!`}
        subtitle="Chaqqon-chaqqon"
        tabs={tabs}
        bottomNavItems={bottomNavItems}
        actions={starsBadge}
        onLogout={signOut}
      >
        <Outlet />
      </DashboardLayout>
    </CurrentStudentContext.Provider>
  );
}
