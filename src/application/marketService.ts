import {
  type MarketItem,
  type MarketOrder,
  type OrderStatus,
  canAfford,
  computeStudentStars,
} from '@/domain/market';
import { AppError } from './errors';
import type {
  ChangeListener,
  Clock,
  IdGenerator,
  MarketRepository,
  ResultRepository,
  StudentRepository,
  Unsubscribe,
} from './ports';

interface MarketDependencies {
  market: MarketRepository;
  results: ResultRepository;
  students?: StudentRepository;
  generateId: IdGenerator;
  clock: Clock;
}

export interface NewMarketItemInput {
  title: string;
  costStars: number;
  imageUrl: string;
  stock: number | null;
}

export function createMarketService({ market, results, students, generateId, clock }: MarketDependencies) {
  return {
    listItems: () => market.listItems(),
    listOrders: () => market.listOrders(),
    subscribe: (listener: ChangeListener): Unsubscribe => market.subscribe(listener),

    async getStudentStars(studentId: string) {
      const [allResults, allOrders, studentList] = await Promise.all([
        results.list(),
        market.listOrders(),
        students ? students.list() : Promise.resolve([]),
      ]);
      const currentStudent = studentList.find((s) => s.id === studentId);
      return computeStudentStars(studentId, allResults, allOrders, currentStudent?.levelGroup);
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

    async buyItem(studentId: string, itemId: string): Promise<MarketOrder> {
      const [items, allResults, allOrders, studentList] = await Promise.all([
        market.listItems(),
        results.list(),
        market.listOrders(),
        students ? students.list() : Promise.resolve([]),
      ]);

      const item = items.find((i) => i.id === itemId);
      if (!item) throw new AppError('ITEM_NOT_FOUND');

      const currentStudent = studentList.find((s) => s.id === studentId);
      const stars = computeStudentStars(studentId, allResults, allOrders, currentStudent?.levelGroup);
      if (!canAfford(stars.balance, item)) {
        throw new AppError('INSUFFICIENT_STARS');
      }

      const order: MarketOrder = {
        id: generateId(),
        studentId,
        itemId: item.id,
        itemTitle: item.title,
        costStars: item.costStars,
        status: 'pending',
        createdAt: clock.now().toISOString(),
      };

      // If item has stock, decrease it
      if (item.stock !== null && item.stock > 0) {
        await market.saveItem({ ...item, stock: item.stock - 1 });
      }

      await market.createOrder(order);
      return order;
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
