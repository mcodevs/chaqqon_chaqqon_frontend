import type { HomeworkStatus, WrittenHomework } from '@/domain/homework';
import type { ChangeListener, HomeworkRepository, Unsubscribe } from './ports';

export interface HomeworkService {
  list(): Promise<WrittenHomework[]>;
  setStatus(studentId: string, date: string, status: HomeworkStatus, notes?: string): Promise<WrittenHomework>;
  subscribe(listener: ChangeListener): Unsubscribe;
}

export function createHomeworkService({ homework }: { homework: HomeworkRepository }): HomeworkService {
  return {
    list() {
      return homework.list();
    },
    setStatus(studentId, date, status, notes) {
      return homework.setStatus(studentId, date, status, notes);
    },
    subscribe(listener) {
      return homework.subscribe(listener);
    },
  };
}
