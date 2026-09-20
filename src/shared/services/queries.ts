import { useCallback, useEffect, useState } from 'react';
import type { RoomSnapshot } from '@/application/competitionService';
import type { CalendarDate, Payment } from '@/domain/billing';
import type { WrittenHomework } from '@/domain/homework';
import type { MarketItem, MarketOrder, StudentStarsBalance } from '@/domain/market';
import type { PracticeResult } from '@/domain/results';
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

export function useRoomSnapshot(): RoomSnapshot | undefined {
  const { competition } = useServices();
  const load = useCallback(() => competition.getSnapshot(), [competition]);
  return useLiveQuery({ load, subscribe: competition.subscribe });
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
