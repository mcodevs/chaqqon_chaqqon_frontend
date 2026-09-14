import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { accessOf } from '@/domain/billing';
import { usePayments, useRoomSnapshot, useSchoolToday, useStudents } from '@/shared/services/queries';
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
  const snapshot = useRoomSnapshot();

  const studentId = session?.role === 'student' ? session.studentId : null;
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
    { to: '/student', label: 'Mashq', end: true },
    { to: '/student/results', label: 'Natijalarim' },
    { to: '/student/leaderboard', label: 'Reyting' },
    { to: '/student/competition', label: hasPendingCompetition ? 'Musobaqa •' : 'Musobaqa' },
  ];

  return (
    <CurrentStudentContext.Provider value={student}>
      <DashboardLayout
        title={`Salom, ${student.firstName}!`}
        subtitle="Chaqqon-chaqqon"
        tabs={tabs}
        onLogout={signOut}
      >
        <Outlet />
      </DashboardLayout>
    </CurrentStudentContext.Provider>
  );
}
