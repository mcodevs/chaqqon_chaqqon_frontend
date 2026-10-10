import { createContext, useContext } from 'react';
import type { Student } from '@/domain/users';

export const CurrentStudentContext = createContext<Student | null>(null);

export function useCurrentStudent(): Student {
  const student = useContext(CurrentStudentContext);
  if (!student) throw new Error('useCurrentStudent must be used inside <StudentLayout>');
  return student;
}

/**
 * Whether the student's own subscription covers today. A closed student still practises and plays
 * with the abacus, but nothing they do is saved.
 */
export const StudentOpenContext = createContext(true);

export function useStudentOpen(): boolean {
  return useContext(StudentOpenContext);
}
