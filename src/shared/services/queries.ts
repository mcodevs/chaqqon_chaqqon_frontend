import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TeacherAccountView } from '@/application/accountService';
import type { RoomSnapshot } from '@/application/competitionService';
import type { PlatformSettings } from '@/application/ports';
import type { TeacherApplication } from '@/domain/applications';
import type { CalendarDate, Payment } from '@/domain/billing';
import type { WrittenHomework } from '@/domain/homework';
import {
  type MarketItem,
  type MarketOrder,
  type StarAward,
  type StudentStarsBalance,
  computeStarsByStudent,
} from '@/domain/market';
import type { DateRange, TeacherOverview } from '@/domain/platformStats';
import type { PracticeResult } from '@/domain/results';
import type { Feature, LedgerEntry, Tariff } from '@/domain/teacherBilling';
import { computeStudentStats } from '@/domain/statistics';
import { type StreakInfo, computeStreak } from '@/domain/streak';
import type { Student, StudentAccount } from '@/domain/users';
import { useLiveQuery } from '@/shared/hooks/useLiveQuery';
import { useServices } from './ServicesContext';

// Service methods are created once in the composition root, so they are stable references.

export function useWrittenHomework(): WrittenHomework[] | undefined {
  const { homework } = useServices();
  return useLiveQuery({ load: homework.list, subscribe: homework.subscribe });
}

export function useStudents(): Student[] | undefined {
  const { students } = useServices();
  return useLiveQuery({ load: students.list, subscribe: students.subscribe, pollIntervalMs: 30_000 });
}

/** Teacher-only: includes usernames. */
export function useStudentAccounts(): StudentAccount[] | undefined {
  const { students } = useServices();
  return useLiveQuery({ load: students.listAccounts, subscribe: students.subscribe, pollIntervalMs: 30_000 });
}

export function useResults(): PracticeResult[] | undefined {
  const { results } = useServices();
  return useLiveQuery({ load: results.list, subscribe: results.subscribe });
}

export function useActiveRooms(): RoomSnapshot[] | undefined {
  const { competition } = useServices();
  return useLiveQuery({ load: competition.getActiveRooms, subscribe: competition.subscribe });
}

export function useStudentRoom(studentId: string): RoomSnapshot | undefined {
  const { competition } = useServices();
  const load = useCallback(() => competition.getSnapshot(studentId), [competition, studentId]);
  return useLiveQuery({
    load,
    subscribe: competition.subscribe,
  });
}

export function useMarketItems(): MarketItem[] | undefined {
  const { market } = useServices();
  return useLiveQuery({ load: market.listItems, subscribe: market.subscribe });
}

export function useMarketOrders(): MarketOrder[] | undefined {
  const { market } = useServices();
  return useLiveQuery({ load: market.listOrders, subscribe: market.subscribe });
}

export function useStudentStars(studentId: string): StudentStarsBalance | undefined {
  const { market } = useServices();
  const load = useCallback(() => market.getStudentStars(studentId), [market, studentId]);
  return useLiveQuery({
    load,
    subscribe: market.subscribe,
  });
}

/** The teacher gets every payment, a student only their own. */
export function usePayments(): Payment[] | undefined {
  const { billing } = useServices();
  return useLiveQuery({ load: billing.listPayments, subscribe: billing.subscribe });
}

/** Today in Tashkent. It updates when the day changes, so access opens and closes on time. */
export function useSchoolToday(): CalendarDate {
  const { billing } = useServices();
  const [today, setToday] = useState(billing.today);

  useEffect(() => {
    let timer: number;
    const scheduleNextDay = () => {
      // A second late, so the new day has surely started.
      timer = window.setTimeout(() => {
        setToday(billing.today());
        scheduleNextDay();
      }, billing.msUntilTomorrow() + 1000);
    };
    scheduleNextDay();
    return () => window.clearTimeout(timer);
  }, [billing]);

  return today;
}

/**
 * Practice streaks are derived from results, so they need no extra query: every caller already has
 * the result list in memory.
 */
export function useStudentStreak(studentId: string): StreakInfo | undefined {
  const results = useResults();
  const today = useSchoolToday();
  return useMemo(() => {
    if (!results) return undefined;
    const mine = results.filter((result) => result.studentId === studentId);
    return computeStreak(computeStudentStats(mine).dailyActivity, today);
  }, [results, studentId, today]);
}

/** Every student's streak in one pass, for the teacher's roster. */
export function useStreaksByStudent(): Map<string, StreakInfo> | undefined {
  const results = useResults();
  const today = useSchoolToday();
  return useMemo(() => {
    if (!results) return undefined;
    const byStudent = new Map<string, PracticeResult[]>();
    for (const result of results) {
      const list = byStudent.get(result.studentId);
      if (list) list.push(result);
      else byStudent.set(result.studentId, [result]);
    }
    const streaks = new Map<string, StreakInfo>();
    for (const [studentId, list] of byStudent) {
      streaks.set(studentId, computeStreak(computeStudentStats(list).dailyActivity, today));
    }
    return streaks;
  }, [results, today]);
}

/** The star ledger: every star given or spent, as the backend wrote it down. */
export function useStarAwards(): StarAward[] | undefined {
  const { market } = useServices();
  return useLiveQuery({ load: market.listAwards, subscribe: market.subscribe });
}

/**
 * Every student's star balance, for the teacher's roster. One ledger covers the whole class, so
 * the roster adds up the balances itself instead of asking per student.
 */
export function useStarsByStudent(): Map<string, StudentStarsBalance> | undefined {
  const students = useStudents();
  const awards = useStarAwards();
  return useMemo(
    () => (students && awards ? computeStarsByStudent(students, awards) : undefined),
    [students, awards],
  );
}

/** The sections open to the signed-in user (a student's come from their teacher's tariff). */
export function useMyFeatures(): Feature[] | undefined {
  const { account } = useServices();
  return useLiveQuery({ load: account.myFeatures, subscribe: account.subscribe, pollIntervalMs: 120_000 });
}

/** Teacher only: tariff, balance and what the balance means today. */
export function useTeacherAccount(): TeacherAccountView | undefined {
  const { account } = useServices();
  return useLiveQuery({
    load: account.getTeacherAccount,
    subscribe: account.subscribe,
    pollIntervalMs: 300_000,
  });
}

/** How teachers reach the superadmin to pay. */
export function usePlatformSettings(): PlatformSettings | undefined {
  const { platform } = useServices();
  return useLiveQuery({ load: platform.getSettings, subscribe: platform.subscribeSettings });
}

/** The tariffs the landing page offers. */
export function useOfferedTariffs(): Tariff[] | undefined {
  const { platform } = useServices();
  return useLiveQuery({ load: platform.listOfferedTariffs, subscribe: platform.subscribeTariffs });
}

/** Superadmin: every teacher, with their class counted for the period. */
export function useAdminTeachers(range: DateRange): TeacherOverview[] | undefined {
  const { admin } = useServices();
  const load = useCallback(() => admin.listTeachers(range), [admin, range]);
  return useLiveQuery({ load, subscribe: admin.subscribe, pollIntervalMs: 120_000 });
}

/** Superadmin: every teacher's ledger. */
export function useAdminLedger(): LedgerEntry[] | undefined {
  const { admin } = useServices();
  return useLiveQuery({ load: admin.listLedger, subscribe: admin.subscribe });
}

/** Superadmin: every tariff, archived ones too. */
export function useAdminTariffs(): Tariff[] | undefined {
  const { admin } = useServices();
  return useLiveQuery({ load: admin.listTariffs, subscribe: admin.subscribe });
}

/** Superadmin: every application from the landing page, newest first. */
export function useApplications(): TeacherApplication[] | undefined {
  const { applications } = useServices();
  return useLiveQuery({ load: applications.list, subscribe: applications.subscribe });
}
