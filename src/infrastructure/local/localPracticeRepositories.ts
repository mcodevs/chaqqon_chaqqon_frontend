import type { MarketRepository, ResultRepository, RoomRepository } from '@/application/ports';
import type { Room, RoomProgress } from '@/domain/competition';
import type { MarketItem, MarketOrder, OrderStatus } from '@/domain/market';
import { type PracticeResult, resolvePracticeMode } from '@/domain/results';
import { type KeyValueStore, keyMatches } from '../storage/keyValueStore';

const KEYS = {
  results: 'results',
  roomsList: 'rooms/all',
  roomsPrefix: 'rooms/',
  progressPrefix: (roomId: string) => `rooms/progress/${roomId}/`,
  marketItems: 'market/items',
  marketOrders: 'market/orders',
  marketPrefix: 'market/',
} as const;

export function createLocalResultRepository(store: KeyValueStore): ResultRepository {
  const list = async (): Promise<PracticeResult[]> => {
    const stored = (await store.get<PracticeResult[]>(KEYS.results)) ?? [];
    return stored.map((result) => ({
      ...result,
      mode: resolvePracticeMode(result.mode, result.roomId ?? null),
    }));
  };

  return {
    list,
    async add(results) {
      await store.set(KEYS.results, [...(await list()), ...results]);
    },
    subscribe: (listener) =>
      store.subscribe((key) => keyMatches(key, (k) => k === KEYS.results) && listener()),
  };
}

export function createLocalRoomRepository(store: KeyValueStore): RoomRepository {
  const listAll = async (): Promise<Room[]> => {
    return (await store.get<Room[]>(KEYS.roomsList)) ?? [];
  };

  return {
    async listActive() {
      const all = await listAll();
      return all
        .filter((room) => room.status !== 'finished')
        .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
    },
    async getById(id: string) {
      const all = await listAll();
      return all.find((room) => room.id === id) ?? null;
    },
    async save(room: Room) {
      const all = await listAll();
      const next = all.some((r) => r.id === room.id)
        ? all.map((r) => (r.id === room.id ? room : r))
        : [...all, room];
      await store.set(KEYS.roomsList, next);
    },
    async listProgress(roomId) {
      const keys = await store.keys(KEYS.progressPrefix(roomId));
      const entries = await Promise.all(keys.map((key) => store.get<RoomProgress>(key)));
      return entries.filter((entry): entry is RoomProgress => entry !== null);
    },
    saveProgress: (progress) =>
      store.set(`${KEYS.progressPrefix(progress.roomId)}${progress.studentId}`, progress),
    subscribe: (listener) =>
      store.subscribe((key) => keyMatches(key, (k) => k.startsWith(KEYS.roomsPrefix)) && listener()),
  };
}

export function createLocalMarketRepository(store: KeyValueStore): MarketRepository {
  const listItems = async (): Promise<MarketItem[]> => {
    return (await store.get<MarketItem[]>(KEYS.marketItems)) ?? [];
  };

  const listOrders = async (): Promise<MarketOrder[]> => {
    return (await store.get<MarketOrder[]>(KEYS.marketOrders)) ?? [];
  };

  return {
    listItems,
    async saveItem(item: MarketItem) {
      const all = await listItems();
      const next = all.some((i) => i.id === item.id)
        ? all.map((i) => (i.id === item.id ? item : i))
        : [...all, item];
      await store.set(KEYS.marketItems, next);
    },
    async deleteItem(id: string) {
      const all = await listItems();
      await store.set(
        KEYS.marketItems,
        all.filter((i) => i.id !== id),
      );
    },
    listOrders,
    async createOrder(order: MarketOrder) {
      const all = await listOrders();
      await store.set(KEYS.marketOrders, [order, ...all]);
    },
    async updateOrderStatus(orderId: string, status: OrderStatus) {
      const all = await listOrders();
      const next = all.map((o) => (o.id === orderId ? { ...o, status } : o));
      await store.set(KEYS.marketOrders, next);
    },
    subscribe: (listener) =>
      store.subscribe((key) => keyMatches(key, (k) => k.startsWith(KEYS.marketPrefix)) && listener()),
  };
}
