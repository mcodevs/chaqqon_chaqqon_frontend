import { Route, Routes } from 'react-router-dom';
import { LoginPage } from '@/features/auth/LoginPage';
import { ClassroomPage } from '@/features/competition/classroom/ClassroomPage';
import { StudentCompetitionPage } from '@/features/competition/StudentCompetitionPage';
import { TeacherCompetitionPage } from '@/features/competition/TeacherCompetitionPage';
import { LeaderboardPage } from '@/features/leaderboard/LeaderboardPage';
import { PracticePage } from '@/features/practice/PracticePage';
import { ResultsPage } from '@/features/student/ResultsPage';
import { StudentLayout } from '@/features/student/StudentLayout';
import { StudentsPage } from '@/features/teacher/StudentsPage';
import { TeacherLayout } from '@/features/teacher/TeacherLayout';
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
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="competition" element={<TeacherCompetitionPage />} />
        <Route path="classroom" element={<ClassroomPage />} />
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
        <Route path="results" element={<ResultsPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="competition" element={<StudentCompetitionPage />} />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
