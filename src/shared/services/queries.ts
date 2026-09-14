import type { RoomSnapshot } from '@/application/competitionService';
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
