import type { StudentRepository } from '@/application/ports';
import type { StudentAccount } from '@/domain/users';
import { createChangeNotifier } from '../shared/changeNotifier';
import type { AppSupabaseClient } from './client';
import type { Database } from './database.types';
import { invokeFunction } from './edgeFunctions';
import { toStudent, toStudentAccount } from './mappers';

/** Reads go through RLS; account changes need the Auth admin API, so they run in an Edge Function. */
export function createSupabaseStudentRepository(client: AppSupabaseClient): StudentRepository {
  // Profiles are kept out of Realtime (payloads would expose usernames), so only this client's changes notify.
  const changes = createChangeNotifier();

  return {
    async list() {
      const { data, error } = await client
        .from('profiles')
        .select('id, first_name, last_name, age, birth_year, level_group, avatar_url, last_active_at')
        .eq('role', 'student')
        .order('created_at');
      if (error) throw error;
      return data.map(toStudent);
    },

    async updateProfile(id, updates) {
      const rowUpdates: Database['public']['Tables']['profiles']['Update'] = {};
      if (updates.birthYear !== undefined) rowUpdates.birth_year = updates.birthYear;
      if (updates.levelGroup !== undefined) rowUpdates.level_group = updates.levelGroup;
      if (updates.avatarUrl !== undefined) rowUpdates.avatar_url = updates.avatarUrl;
      if (updates.lastActiveAt !== undefined) rowUpdates.last_active_at = updates.lastActiveAt;

      const { error } = await client.from('profiles').update(rowUpdates).eq('id', id);
      if (error) throw error;
      changes.notify();
    },

    async touchActive(id) {
      // Fire and forget, don't block user interactions if offline or fail
      void client.from('profiles').update({ last_active_at: new Date().toISOString() }).eq('id', id);
    },

    async listAccounts() {
      const { data, error } = await client.rpc('student_accounts');
      if (error) throw error;
      return data.map(toStudentAccount);
    },

    async create(student, password) {
      const { student: created } = await invokeFunction<{ student: StudentAccount }>(
        client,
        'manage-students',
        {
          action: 'create',
          ...student,
          password,
        },
      );
      changes.notify();
      return created;
    },

    async setPassword(id, password) {
      await invokeFunction(client, 'manage-students', { action: 'set-password', studentId: id, password });
    },

    async remove(id) {
      await invokeFunction(client, 'manage-students', { action: 'delete', studentId: id });
      changes.notify();
    },

    subscribe: changes.subscribe,
  };
}
