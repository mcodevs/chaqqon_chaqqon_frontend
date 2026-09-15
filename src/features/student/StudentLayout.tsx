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
import { DashboardLayout } from '@/shared/ui/DashboardLayout';
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

  const tabs = [
    { to: '/student', label: '🧮 Mashq', end: true },
    { to: '/student/results', label: '📈 Natijalarim' },
    { to: '/student/market', label: "🎁 Do'kon" },
    { to: '/student/leaderboard', label: '🏆 Reyting' },
    { to: '/student/competition', label: hasPendingCompetition ? '⚡ Musobaqa •' : '⚡ Musobaqa' },
  ];

  const starsBadge = (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: 'var(--color-surface)',
        border: '2px solid var(--color-yellow)',
        padding: '6px 12px',
        borderRadius: '14px',
        fontWeight: 800,
        fontSize: '14px',
        color: '#b38100',
        boxShadow: '0 2px 8px rgba(255, 217, 61, 0.25)',
      }}
      title="Musobaqalardan ishlangan yulduzchalaringiz"
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
        actions={starsBadge}
        onLogout={signOut}
      >
        <Outlet />
      </DashboardLayout>
    </CurrentStudentContext.Provider>
  );
}
