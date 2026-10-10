import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { accessOf } from '@/domain/billing';
import { type Feature, hasFeature } from '@/domain/teacherBilling';
import {
  useMyFeatures,
  usePayments,
  useSchoolToday,
  useStudentRoom,
  useStudentStars,
  useStudents,
} from '@/shared/services/queries';
import { useSession } from '@/shared/session/SessionContext';
import { type BottomNavItem, DashboardLayout } from '@/shared/ui/DashboardLayout';
import { LoadingScreen } from '@/shared/ui/LoadingScreen';
import { useServices } from '@/shared/services/ServicesContext';
import { ClosedAccountPage } from './ClosedAccountPage';
import styles from './StudentLayout.module.css';
import { CurrentStudentContext } from './CurrentStudentContext';

export function StudentLayout() {
  const { session, signOut } = useSession();
  const students = useStudents();
  const payments = usePayments();
  const today = useSchoolToday();
  const studentId = session?.role === 'student' ? session.studentId : null;
  const snapshot = useStudentRoom(studentId ?? '');
  const stars = useStudentStars(studentId ?? '');
  const features = useMyFeatures();
  const student = students?.find((s) => s.id === studentId) ?? null;
  const accountDeleted = students !== undefined && student === null;

  const { students: studentService } = useServices();
  useEffect(() => {
    if (!studentId) return;

    void studentService.touchActive(studentId);

    const interval = setInterval(() => {
      void studentService.touchActive(studentId);
    }, 90_000);

    return () => clearInterval(interval);
  }, [studentId, studentService]);

  useEffect(() => {
    if (accountDeleted) signOut();
  }, [accountDeleted, signOut]);

  if (!student || !payments || !features) return <LoadingScreen />;

  const access = accessOf(payments, student.id, today);
  if (!access.open) {
    return <ClosedAccountPage student={student} paidUntil={access.paidUntil} onLogout={signOut} />;
  }

  const hasPendingCompetition =
    snapshot?.room?.participantIds.includes(student.id) === true && !snapshot.progress[student.id]?.finished;

  // Ustozning tarifi qaysi bo'limlarni ochgan bo'lsa, o'quvchida ham faqat o'shalar ko'rinadi.
  const open = <T extends { feature?: Feature }>(sections: T[]) =>
    sections.filter((section) => !section.feature || hasFeature(features, section.feature));

  // Desktop sidebar uchun to'liq bo'limlar
  const tabs = open([
    { to: '/student', label: '⚡ Mashq', end: true },
    { to: '/student/abacus', label: '🧮 Abakus' },
    {
      to: '/student/competition',
      label: hasPendingCompetition ? '📝 Interaktiv vazifa •' : '📝 Interaktiv vazifa',
      feature: 'homework_rooms' as const,
    },
    { to: '/student/leaderboard', label: '🏆 Reyting', feature: 'leaderboard' as const },
    { to: '/student/results', label: '📈 Natijalarim' },
    { to: '/student/market', label: "🎁 Do'kon", feature: 'market' as const },
    { to: '/student/profile', label: '👤 Profil' },
  ]);

  // Mobile Bottom Navigation Bar uchun eng asosiy bo'limlar; profil har doim oxirida turadi.
  const bottomNavItems: BottomNavItem[] = [
    ...open<BottomNavItem & { feature?: Feature }>([
      { to: '/student', label: 'Mashq', icon: '⚡', end: true },
      { to: '/student/abacus', label: 'Abakus', icon: '🧮' },
      {
        to: '/student/competition',
        label: 'Uy vazifasi',
        icon: '📝',
        badge: hasPendingCompetition,
        feature: 'homework_rooms',
      },
      { to: '/student/leaderboard', label: 'Reyting', icon: '🏆', feature: 'leaderboard' },
      { to: '/student/results', label: 'Natijalar', icon: '📈' },
    ]).slice(0, 4),
    { to: '/student/profile', label: 'Profil', icon: '👤' },
  ];
  // Yulduzlar uy vazifasidan keladi va do'konda sarflanadi; ikkalasi ham yo'q bo'lsa, ko'rsatilmaydi.
  const showStars = hasFeature(features, 'market') || hasFeature(features, 'homework_rooms');

  const starsBadge = (
    <div className={styles.starsBadge} title="Yulduzchalaringiz balansi">
      <span aria-hidden="true">⭐</span>
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
        actions={showStars ? starsBadge : undefined}
        onLogout={signOut}
      >
        <Outlet />
      </DashboardLayout>
    </CurrentStudentContext.Provider>
  );
}
