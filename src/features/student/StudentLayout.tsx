import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useRoomSnapshot, useStudents } from '@/shared/services/queries';
import { useSession } from '@/shared/session/SessionContext';
import { DashboardLayout } from '@/shared/ui/DashboardLayout';
import { LoadingScreen } from '@/shared/ui/LoadingScreen';
import { CurrentStudentContext } from './CurrentStudentContext';

export function StudentLayout() {
  const { session, signOut } = useSession();
  const students = useStudents();
  const snapshot = useRoomSnapshot();

  const studentId = session?.role === 'student' ? session.studentId : null;
  const student = students?.find((s) => s.id === studentId) ?? null;
  const accountDeleted = students !== undefined && student === null;

  useEffect(() => {
    if (accountDeleted) signOut();
  }, [accountDeleted, signOut]);

  if (!student) return <LoadingScreen />;

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
