import { AppError } from '@/application/errors';
import type { ChangeListener, ResultRepository, RoomRepository, Unsubscribe } from '@/application/ports';
import { createChangeNotifier } from '../shared/changeNotifier';
import type { AppSupabaseClient } from './client';
import { POSTGRES_UNIQUE_VIOLATION } from './edgeFunctions';
import {
  toPracticeResult,
  toPracticeResultRow,
  toRoom,
  toRoomProgress,
  toRoomProgressRow,
  toRoomRow,
} from './mappers';
import { type RealtimeTable, subscribeToTables } from './realtime';

/** Own writes refresh at once; Realtime brings in everyone else's. */
function liveSubscription(client: AppSupabaseClient, tables: readonly RealtimeTable[]) {
  const changes = createChangeNotifier();

  const subscribe = (listener: ChangeListener): Unsubscribe => {
    const stopLocal = changes.subscribe(listener);
    const stopRemote = subscribeToTables(client, tables, listener);
    return () => {
      stopLocal();
      stopRemote();
    };
  };

  return { notify: changes.notify, subscribe };
}

export function createSupabaseResultRepository(client: AppSupabaseClient): ResultRepository {
  const live = liveSubscription(client, ['practice_results']);

  return {
    async list() {
      const { data, error } = await client.from('practice_results').select('*').order('completed_at');
      if (error) throw error;
      return data.map(toPracticeResult);
    },

    // A single insert, so a classroom match is saved for everyone or for no one.
    async add(results) {
      const { error } = await client.from('practice_results').insert(results.map(toPracticeResultRow));
      if (error) throw error;
      live.notify();
    },

    subscribe: live.subscribe,
  };
}

export function createSupabaseRoomRepository(client: AppSupabaseClient): RoomRepository {
  const live = liveSubscription(client, ['rooms', 'room_progress']);

  return {
    // RLS limits students to rooms they take part in, so "latest visible room" is the current one for everybody.
    async getCurrent() {
      const { data, error } = await client
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? toRoom(data) : null;
    },

    async saveCurrent(room) {
      const { error } = await client.from('rooms').upsert(toRoomRow(room));
      if (error?.code === POSTGRES_UNIQUE_VIOLATION) throw new AppError('ROOM_ACTIVE');
      if (error) throw error;
      live.notify();
    },

    async listProgress(roomId) {
      const { data, error } = await client.from('room_progress').select('*').eq('room_id', roomId);
      if (error) throw error;
      return data.map(toRoomProgress);
    },

    async saveProgress(progress) {
      const { error } = await client
        .from('room_progress')
        .upsert(toRoomProgressRow(progress), { onConflict: 'room_id,student_id' });
      if (error) throw error;
      live.notify();
    },

    subscribe: live.subscribe,
  };
}
