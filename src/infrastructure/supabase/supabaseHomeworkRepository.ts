import type { HomeworkRepository } from '@/application/ports';
import type { HomeworkStatus, WrittenHomework } from '@/domain/homework';
import type { AppSupabaseClient } from './client';
import { toWrittenHomework } from './mappers';
import { liveSubscription } from './realtime';

export function createSupabaseHomeworkRepository(client: AppSupabaseClient): HomeworkRepository {
  const live = liveSubscription(client, ['written_homework']);

  return {
    async list(): Promise<WrittenHomework[]> {
      const { data, error } = await client
        .from('written_homework')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return (data ?? []).map(toWrittenHomework);
    },

    async setStatus(studentId: string, date: string, status: HomeworkStatus, notes = ''): Promise<WrittenHomework> {
      const { data, error } = await client
        .from('written_homework')
        .upsert(
          {
            student_id: studentId,
            date,
            status,
            notes,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'student_id,date' },
        )
        .select()
        .single();
      if (error) throw error;
      live.notify();
      return toWrittenHomework(data);
    },

    subscribe: live.subscribe,
  };
}
