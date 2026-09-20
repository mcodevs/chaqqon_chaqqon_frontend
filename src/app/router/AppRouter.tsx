import { Route, Routes } from 'react-router-dom';
import { AbacusPage } from '@/features/abacus/AbacusPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { ClassroomPage } from '@/features/competition/classroom/ClassroomPage';
import { StudentCompetitionPage } from '@/features/competition/StudentCompetitionPage';
import { TeacherCompetitionPage } from '@/features/competition/TeacherCompetitionPage';
import { LeaderboardPage } from '@/features/leaderboard/LeaderboardPage';
import { PracticePage } from '@/features/practice/PracticePage';
import { ResultsPage } from '@/features/student/ResultsPage';
import { StudentLayout } from '@/features/student/StudentLayout';
import { StudentMarketPage } from '@/features/student/StudentMarketPage';
import { StudentProfilePage } from '@/features/student/StudentProfilePage';
import { StudentsPage } from '@/features/teacher/StudentsPage';
import { TeacherLayout } from '@/features/teacher/TeacherLayout';
import { TeacherMarketPage } from '@/features/teacher/TeacherMarketPage';
import { TeacherProfilePage } from '@/features/teacher/TeacherProfilePage';
import { TeacherStatsPage } from '@/features/teacher/TeacherStatsPage';
import { GuestOnly, HomeRedirect, RequireRole } from './routeGuards';

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />

      <Route
        path="/teacher"
        element={
          <RequireRole role="teacher">
            <TeacherLayout />
          </RequireRole>
        }
      >
        <Route index element={<StudentsPage />} />
        <Route path="stats" element={<TeacherStatsPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="competition" element={<TeacherCompetitionPage />} />
        <Route path="classroom" element={<ClassroomPage />} />
        <Route path="abacus" element={<AbacusPage />} />
        <Route path="market" element={<TeacherMarketPage />} />
        <Route path="profile" element={<TeacherProfilePage />} />
      </Route>

      <Route
        path="/student"
        element={
          <RequireRole role="student">
            <StudentLayout />
          </RequireRole>
        }
      >
        <Route index element={<PracticePage />} />
        <Route path="abacus" element={<AbacusPage />} />
        <Route path="results" element={<ResultsPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="competition" element={<StudentCompetitionPage />} />
        <Route path="market" element={<StudentMarketPage />} />
        <Route path="profile" element={<StudentProfilePage />} />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
