import { useEffect, useState } from 'react';
import type { RoomSnapshot } from '@/application/competitionService';
import type { CalendarDate, Payment } from '@/domain/billing';
import type { PracticeResult } from '@/domain/results';
import type { Student, StudentAccount } from '@/domain/users';
import { useLiveQuery } from '@/shared/hooks/useLiveQuery';
import { useServices } from './ServicesContext';

// Service methods are created once in the composition root, so they are stable references.

export function useStudents(): Student[] | undefined {
  const { students } = useServices();
  return useLiveQuery({ load: students.list, subscribe: students.subscribe });
}

/** Teacher-only: includes usernames. */
export function useStudentAccounts(): StudentAccount[] | undefined {
  const { students } = useServices();
  return useLiveQuery({ load: students.listAccounts, subscribe: students.subscribe });
}

export function useResults(): PracticeResult[] | undefined {
  const { results } = useServices();
  return useLiveQuery({ load: results.list, subscribe: results.subscribe });
}

export function useRoomSnapshot(): RoomSnapshot | undefined {
  const { competition } = useServices();
  return useLiveQuery({ load: competition.getSnapshot, subscribe: competition.subscribe });
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
