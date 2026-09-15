import { AppError } from '@/application/errors';
import type { MarketRepository, ResultRepository, RoomRepository } from '@/application/ports';
import type { AppSupabaseClient } from './client';
import { POSTGRES_UNIQUE_VIOLATION } from './edgeFunctions';
import {
  toMarketItem,
  toMarketItemRow,
  toMarketOrder,
  toMarketOrderRow,
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
      const { data, error } = await client
        .from('rooms')
        .select('*')
        .eq('id', id)
        .maybeSingle();
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
  const live = liveSubscription(client, ['market_items', 'market_orders']);

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

    async createOrder(order) {
      const { error } = await client.from('market_orders').insert(toMarketOrderRow(order));
      if (error) throw error;
      live.notify();
    },

    async updateOrderStatus(orderId, status) {
      const { error } = await client.from('market_orders').update({ status }).eq('id', orderId);
      if (error) throw error;
      live.notify();
    },

    subscribe: live.subscribe,
  };
}
