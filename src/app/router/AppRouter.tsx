import { Route, Routes } from 'react-router-dom';
import { AbacusPage } from '@/features/abacus/AbacusPage';
import { AdminApplicationsPage } from '@/features/admin/AdminApplicationsPage';
import { AdminFinancePage } from '@/features/admin/AdminFinancePage';
import { AdminLayout } from '@/features/admin/AdminLayout';
import { AdminSettingsPage } from '@/features/admin/AdminSettingsPage';
import { AdminStatsPage } from '@/features/admin/AdminStatsPage';
import { AdminTariffsPage } from '@/features/admin/AdminTariffsPage';
import { AdminTeacherPage } from '@/features/admin/AdminTeacherPage';
import { AdminTeachersPage } from '@/features/admin/AdminTeachersPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { LandingPage } from '@/features/landing/LandingPage';
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
import { WorksheetPage } from '@/features/teacher/worksheet/WorksheetPage';
import { GuestOnly, HomeRedirect, LandingOrHome, RequireFeature, RequireRole } from './routeGuards';

export function AppRouter() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <LandingOrHome>
            <LandingPage />
          </LandingOrHome>
        }
      />

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
        <Route
          path="stats"
          element={
            <RequireFeature feature="stats">
              <TeacherStatsPage />
            </RequireFeature>
          }
        />
        <Route
          path="leaderboard"
          element={
            <RequireFeature feature="leaderboard">
              <LeaderboardPage />
            </RequireFeature>
          }
        />
        <Route
          path="competition"
          element={
            <RequireFeature feature="homework_rooms">
              <TeacherCompetitionPage />
            </RequireFeature>
          }
        />
        <Route
          path="classroom"
          element={
            <RequireFeature feature="classroom">
              <ClassroomPage />
            </RequireFeature>
          }
        />
        <Route
          path="worksheet"
          element={
            <RequireFeature feature="worksheet">
              <WorksheetPage />
            </RequireFeature>
          }
        />
        <Route path="abacus" element={<AbacusPage />} />
        <Route
          path="market"
          element={
            <RequireFeature feature="market">
              <TeacherMarketPage />
            </RequireFeature>
          }
        />
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
        <Route
          path="leaderboard"
          element={
            <RequireFeature feature="leaderboard">
              <LeaderboardPage />
            </RequireFeature>
          }
        />
        <Route
          path="competition"
          element={
            <RequireFeature feature="homework_rooms">
              <StudentCompetitionPage />
            </RequireFeature>
          }
        />
        <Route
          path="market"
          element={
            <RequireFeature feature="market">
              <StudentMarketPage />
            </RequireFeature>
          }
        />
        <Route path="profile" element={<StudentProfilePage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <RequireRole role="admin">
            <AdminLayout />
          </RequireRole>
        }
      >
        <Route index element={<AdminStatsPage />} />
        <Route path="applications" element={<AdminApplicationsPage />} />
        <Route path="teachers" element={<AdminTeachersPage />} />
        <Route path="teachers/:teacherId" element={<AdminTeacherPage />} />
        <Route path="finance" element={<AdminFinancePage />} />
        <Route path="tariffs" element={<AdminTariffsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
