import { type MarketItem, type OrderStatus, canAfford, computeStudentStars } from '@/domain/market';
import { AppError } from './errors';
import type { ChangeListener, Clock, IdGenerator, MarketRepository, Unsubscribe } from './ports';

interface MarketDependencies {
  market: MarketRepository;
  generateId: IdGenerator;
  clock: Clock;
}

export interface NewMarketItemInput {
  title: string;
  costStars: number;
  imageUrl: string;
  stock: number | null;
}

export function createMarketService({ market, generateId, clock }: MarketDependencies) {
  return {
    listItems: () => market.listItems(),
    listOrders: () => market.listOrders(),
    subscribe: (listener: ChangeListener): Unsubscribe => market.subscribe(listener),

    listAwards: () => market.listAwards(),

    async getStudentStars(studentId: string) {
      return computeStudentStars(studentId, await market.listAwards());
    },

    async saveItem(input: NewMarketItemInput & { id?: string }): Promise<MarketItem> {
      const item: MarketItem = {
        id: input.id ?? generateId(),
        title: input.title.trim(),
        costStars: Math.max(1, Math.round(input.costStars)),
        imageUrl: input.imageUrl.trim() || '🎁',
        stock: input.stock !== null ? Math.max(0, Math.round(input.stock)) : null,
        createdAt: clock.now().toISOString(),
      };
      await market.saveItem(item);
      return item;
    },

    async deleteItem(id: string): Promise<void> {
      await market.deleteItem(id);
    },

    /** Checked here for a quick answer; the backend checks stock and stars again as it takes them. */
    async buyItem(studentId: string, itemId: string): Promise<void> {
      const [items, awards] = await Promise.all([market.listItems(), market.listAwards()]);

      const item = items.find((i) => i.id === itemId);
      if (!item) throw new AppError('ITEM_NOT_FOUND');
      if (item.stock !== null && item.stock <= 0) throw new AppError('OUT_OF_STOCK');

      const stars = computeStudentStars(studentId, awards);
      if (!canAfford(stars.balance, item)) {
        throw new AppError('INSUFFICIENT_STARS');
      }

      await market.placeOrder(item.id);
    },

    async updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
      const orders = await market.listOrders();
      const order = orders.find((o) => o.id === orderId);
      if (!order) throw new AppError('ORDER_NOT_FOUND');

      // If an order was pending and is cancelled, restore stock
      if (order.status === 'pending' && status === 'cancelled') {
        const items = await market.listItems();
        const item = items.find((i) => i.id === order.itemId);
        if (item && item.stock !== null) {
          await market.saveItem({ ...item, stock: item.stock + 1 });
        }
      }

      await market.updateOrderStatus(orderId, status);
    },
  };
}

export type MarketService = ReturnType<typeof createMarketService>;
