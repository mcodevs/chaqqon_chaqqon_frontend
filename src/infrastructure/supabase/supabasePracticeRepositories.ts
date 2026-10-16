import { AppError } from '@/application/errors';
import type { DuelRepository, MarketRepository, ResultRepository, RoomRepository } from '@/application/ports';
import type { AppSupabaseClient } from './client';
import type { Database } from './database.types';
import { POSTGRES_INSUFFICIENT_PRIVILEGE, POSTGRES_UNIQUE_VIOLATION, raisedAppError } from './edgeFunctions';
import {
  toDuel,
  toDuelParticipant,
  toDuelParticipantRow,
  toDuelRow,
  toMarketItem,
  toMarketItemRow,
  toMarketOrder,
  toStarAward,
  toPracticeResult,
  toPracticeResultRow,
  toRoom,
  toRoomProgress,
  toRoomProgressRow,
  toRoomRow,
} from './mappers';
import { liveSubscription } from './realtime';

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
    async listActive() {
      const { data, error } = await client
        .from('rooms')
        .select('*')
        .neq('status', 'finished')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(toRoom);
    },

    async getById(id: string) {
      const { data, error } = await client.from('rooms').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data ? toRoom(data) : null;
    },

    async save(room) {
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

export function createSupabaseMarketRepository(client: AppSupabaseClient): MarketRepository {
  const live = liveSubscription(client, ['market_items', 'market_orders', 'star_awards']);

  return {
    async listItems() {
      const { data, error } = await client
        .from('market_items')
        .select('*')
        .order('cost_stars', { ascending: true });
      if (error) throw error;
      return data.map(toMarketItem);
    },

    async saveItem(item) {
      const { error } = await client.from('market_items').upsert(toMarketItemRow(item));
      if (error) throw error;
      live.notify();
    },

    async deleteItem(id) {
      const { error } = await client.from('market_items').delete().eq('id', id);
      if (error) throw error;
      live.notify();
    },

    async listOrders() {
      const { data, error } = await client
        .from('market_orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(toMarketOrder);
    },

    async placeOrder(itemId) {
      const { error } = await client.rpc('place_order', { p_item_id: itemId });
      if (error) {
        throw raisedAppError(error, [
          'ITEM_NOT_FOUND',
          'OUT_OF_STOCK',
          'INSUFFICIENT_STARS',
          'FEATURE_DISABLED',
        ]);
      }
      live.notify();
    },

    async listAwards() {
      const { data, error } = await client
        .from('star_awards')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(toStarAward);
    },

    async updateOrderStatus(orderId, status) {
      const { error } = await client.from('market_orders').update({ status }).eq('id', orderId);
      if (error) throw error;
      live.notify();
    },

    subscribe: live.subscribe,
  };
}

export function createSupabaseDuelRepository(client: AppSupabaseClient): DuelRepository {
  const live = liveSubscription(client, ['duels', 'duel_participants']);

  /** The host's row and a finished duel's results are written by triggers, not from here. */
  const drive = async (id: string, changes: Database['public']['Tables']['duels']['Update']) => {
    const { error } = await client.from('duels').update(changes).eq('id', id);
    if (error) throw error;
    live.notify();
  };

  return {
    async listRecent(limit) {
      const { data, error } = await client
        .from('duels')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data.map(toDuel);
    },

    async getById(id) {
      const { data, error } = await client.from('duels').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data ? toDuel(data) : null;
    },

    async open(duel) {
      const { error } = await client.from('duels').insert(toDuelRow(duel));
      // A student cannot see who has paid, so the policy is what turns one of them down.
      if (error?.code === POSTGRES_INSUFFICIENT_PRIVILEGE) throw new AppError('DUEL_GUEST_UNAVAILABLE');
      if (error) throw error;
      live.notify();
    },

    async join(participant) {
      const { error } = await client.from('duel_participants').insert(toDuelParticipantRow(participant));
      if (error) throw new AppError('DUEL_CLOSED');
      live.notify();
    },

    start: (id, startedAt) => drive(id, { status: 'running', round: 0, started_at: startedAt }),

    setRound: (id, round) => drive(id, { round }),

    finish: (id) => drive(id, { status: 'finished', finished_at: new Date().toISOString() }),

    async listParticipants(duelIds) {
      if (duelIds.length === 0) return [];
      const { data, error } = await client
        .from('duel_participants')
        .select('*')
        .in('duel_id', duelIds)
        .order('joined_at');
      if (error) throw error;
      return data.map(toDuelParticipant);
    },

    async saveProgress(progress) {
      const { error } = await client
        .from('duel_participants')
        .update({
          answered: progress.answered,
          correct: progress.correct,
          answer_ms: progress.answerMs,
        })
        .eq('duel_id', progress.duelId)
        .eq('student_id', progress.studentId);
      if (error) throw error;
      live.notify();
    },

    subscribe: live.subscribe,
  };
}
