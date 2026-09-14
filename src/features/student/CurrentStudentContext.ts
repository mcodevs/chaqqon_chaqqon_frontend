import { createContext, useContext } from 'react';
import type { Student } from '@/domain/users';

export const CurrentStudentContext = createContext<Student | null>(null);

export function useCurrentStudent(): Student {
  const student = useContext(CurrentStudentContext);
  if (!student) throw new Error('useCurrentStudent must be used inside <StudentLayout>');
  return student;
}
