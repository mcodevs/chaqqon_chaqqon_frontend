export type HomeworkStatus = 'bajardi' | 'chala' | 'bajarmadi';

export interface WrittenHomework {
  id: string;
  studentId: string;
  date: string;
  status: HomeworkStatus;
  notes: string;
  updatedAt: string;
}

export const HOMEWORK_STATUS_META: Record<
  HomeworkStatus,
  { label: string; tone: 'green' | 'amber' | 'coral'; icon: string }
> = {
  bajardi: { label: 'Bajardi', tone: 'green', icon: '✓' },
  chala: { label: 'Chala', tone: 'amber', icon: '⚠' },
  bajarmadi: { label: 'Bajarmadi', tone: 'coral', icon: '✕' },
};
