import { AppError } from '@/application/errors';
import type { DuelRepository, MarketRepository, ResultRepository, RoomRepository } from '@/application/ports';
import type { Room, RoomProgress } from '@/domain/competition';
import { type Duel, type DuelParticipant, isDuelStale } from '@/domain/duel';
import {
  type MarketItem,
  type MarketOrder,
  type OrderStatus,
  type StarAward,
  computeStudentStars,
} from '@/domain/market';
import { type PracticeResult, resolvePracticeMode } from '@/domain/results';
import { hasFeature } from '@/domain/teacherBilling';
import { type KeyValueStore, keyMatches } from '../storage/keyValueStore';
import type { LocalPlatform } from './localPlatform';

const KEYS = {
  results: 'results',
  roomsList: 'rooms/all',
  roomsPrefix: 'rooms/',
  progressPrefix: (roomId: string) => `rooms/progress/${roomId}/`,
  duelsList: 'duels/all',
  duelsPrefix: 'duels/',
  duelPlayersPrefix: (duelId: string) => `duels/players/${duelId}/`,
  marketItems: 'market/items',
  marketOrders: 'market/orders',
  marketPrefix: 'market/',
} as const;

/** Rooms and shop items are stored with their teacher, as the database keeps them. */
type Owned<T> = T & { teacherId?: string };

const withoutOwner = <T extends object>({ teacherId: _owner, ...rest }: Owned<T>): T => rest as T;

export function createLocalResultRepository(store: KeyValueStore, platform: LocalPlatform): ResultRepository {
  const listAll = async (): Promise<PracticeResult[]> => {
    const stored = (await store.get<PracticeResult[]>(KEYS.results)) ?? [];
    return stored.map((result) => ({
      ...result,
      mode: resolvePracticeMode(result.mode, result.roomId ?? null),
    }));
  };

  return {
    /** The caller's class only: a teacher's students, or a student's classmates. */
    async list() {
      const visible = await platform.visibleStudentIds();
      return (await listAll()).filter((result) => visible.has(result.studentId));
    },
    async add(results) {
      await store.set(KEYS.results, [...(await listAll()), ...results]);
    },
    subscribe: (listener) =>
      store.subscribe((key) => keyMatches(key, (k) => k === KEYS.results) && listener()),
  };
}

export function createLocalRoomRepository(store: KeyValueStore, platform: LocalPlatform): RoomRepository {
  const listAll = async (): Promise<Owned<Room>[]> => (await store.get<Owned<Room>[]>(KEYS.roomsList)) ?? [];

  /** A teacher's own rooms, or the rooms a student takes part in. */
  const isVisible = (room: Owned<Room>) => {
    const current = platform.session();
    if (current?.role === 'teacher') return room.teacherId === current.teacherId;
    if (current?.role === 'student') return room.participantIds.includes(current.studentId);
    return false;
  };

  return {
    async listActive() {
      return (await listAll())
        .filter((room) => room.status !== 'finished' && isVisible(room))
        .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
        .map(withoutOwner<Room>);
    },
    async getById(id: string) {
      const room = (await listAll()).find((r) => r.id === id && isVisible(r));
      return room ? withoutOwner<Room>(room) : null;
    },
    async save(room: Room) {
      await platform.assertCanManage();
      const all = await listAll();
      const existing = all.find((r) => r.id === room.id);
      if (existing && existing.teacherId !== platform.myTeacherId()) throw new AppError('ROOM_NOT_FOUND');
      const owned: Owned<Room> = {
        ...room,
        teacherId: existing?.teacherId ?? platform.myTeacherId() ?? undefined,
      };
      const next = existing ? all.map((r) => (r.id === room.id ? owned : r)) : [...all, owned];
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

export function createLocalMarketRepository(store: KeyValueStore, platform: LocalPlatform): MarketRepository {
  const listAllItems = async (): Promise<Owned<MarketItem>[]> =>
    (await store.get<Owned<MarketItem>[]>(KEYS.marketItems)) ?? [];

  const listAllOrders = async (): Promise<MarketOrder[]> =>
    (await store.get<MarketOrder[]>(KEYS.marketOrders)) ?? [];

  /** A teacher sees their students' orders and stars, a student only their own. */
  const isMine = async (studentId: string) => {
    const current = platform.session();
    if (current?.role === 'student') return current.studentId === studentId;
    return (await platform.ownStudentIds()).has(studentId);
  };

  /*
   * On Supabase a star is a row written by a trigger. This browser-only backend has no triggers,
   * so it works the ledger out from what it does store, following the same two rules: a homework
   * answered without a mistake pays one star, and an order spends its price back until cancelled.
   */
  const allAwards = async (): Promise<StarAward[]> => {
    const [results, orders] = await Promise.all([store.get<PracticeResult[]>(KEYS.results), listAllOrders()]);

    const awards: StarAward[] = [];

    for (const result of results ?? []) {
      const mode = resolvePracticeMode(result.mode, result.roomId ?? null);
      if (mode !== 'online' || result.total <= 0 || result.correct * 10 < result.total * 9) continue;
      awards.push({
        id: `homework:${result.id}`,
        studentId: result.studentId,
        delta: 1,
        reason: 'homework',
        sourceResultId: result.id,
        sourceOrderId: null,
        note: null,
        createdAt: result.completedAt,
      });
    }

    for (const order of orders) {
      if (order.status === 'cancelled') continue;
      awards.push({
        id: `purchase:${order.id}`,
        studentId: order.studentId,
        delta: -order.costStars,
        reason: 'purchase',
        sourceResultId: null,
        sourceOrderId: order.id,
        note: null,
        createdAt: order.createdAt,
      });
    }

    return awards;
  };

  const filterMine = async <T extends { studentId: string }>(rows: T[]): Promise<T[]> => {
    const keep = await Promise.all(rows.map((row) => isMine(row.studentId)));
    return rows.filter((_, i) => keep[i]);
  };

  return {
    async listItems() {
      const teacherId = platform.myTeacherId();
      return (await listAllItems())
        .filter((item) => item.teacherId === teacherId)
        .map(withoutOwner<MarketItem>);
    },

    listAwards: async () => filterMine(await allAwards()),

    async saveItem(item: MarketItem) {
      await platform.assertCanManage();
      const teacherId = platform.myTeacherId() ?? undefined;
      const all = await listAllItems();
      const existing = all.find((i) => i.id === item.id);
      if (existing && existing.teacherId !== teacherId) throw new AppError('ITEM_NOT_FOUND');
      const owned: Owned<MarketItem> = { ...item, teacherId };
      await store.set(
        KEYS.marketItems,
        existing ? all.map((i) => (i.id === item.id ? owned : i)) : [...all, owned],
      );
    },

    async deleteItem(id: string) {
      await platform.assertCanManage();
      const teacherId = platform.myTeacherId();
      await store.set(
        KEYS.marketItems,
        (await listAllItems()).filter((i) => !(i.id === id && i.teacherId === teacherId)),
      );
    },

    listOrders: async () => filterMine(await listAllOrders()),

    async placeOrder(itemId: string) {
      const current = platform.session();
      if (current?.role !== 'student') throw new AppError('FORBIDDEN');
      if (!hasFeature(await platform.featuresOf(current.teacherId), 'market'))
        throw new AppError('FEATURE_DISABLED');

      const items = await listAllItems();
      const item = items.find((i) => i.id === itemId && i.teacherId === current.teacherId);
      if (!item) throw new AppError('ITEM_NOT_FOUND');
      if (item.stock !== null && item.stock <= 0) throw new AppError('OUT_OF_STOCK');
      if (computeStudentStars(current.studentId, await allAwards()).balance < item.costStars) {
        throw new AppError('INSUFFICIENT_STARS');
      }

      if (item.stock !== null) {
        await store.set(
          KEYS.marketItems,
          items.map((i) => (i.id === item.id ? { ...i, stock: (i.stock ?? 1) - 1 } : i)),
        );
      }
      const order: MarketOrder = {
        id: crypto.randomUUID(),
        studentId: current.studentId,
        itemId: item.id,
        itemTitle: item.title,
        costStars: item.costStars,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      await store.set(KEYS.marketOrders, [order, ...(await listAllOrders())]);
    },

    async updateOrderStatus(orderId: string, status: OrderStatus) {
      await platform.assertCanManage();
      const all = await listAllOrders();
      const order = all.find((o) => o.id === orderId);
      if (!order || !(await isMine(order.studentId))) throw new AppError('ORDER_NOT_FOUND');
      await store.set(
        KEYS.marketOrders,
        all.map((o) => (o.id === orderId ? { ...o, status } : o)),
      );
    },

    subscribe: (listener) =>
      store.subscribe((key) => keyMatches(key, (k) => k.startsWith(KEYS.marketPrefix)) && listener()),
  };
}

/**
 * The duels the children run among themselves. On Supabase the host's own participant row and the
 * practice results of a finished duel come from triggers; here the repository does both itself, as
 * it does for the star ledger, so the app behaves the same on both backends.
 */
export function createLocalDuelRepository(store: KeyValueStore, platform: LocalPlatform): DuelRepository {
  const listAll = async (): Promise<Owned<Duel>[]> => (await store.get<Owned<Duel>[]>(KEYS.duelsList)) ?? [];

  /** A duel is visible to the classmates it invited and to the teacher of that class. */
  const isVisible = (duel: Owned<Duel>) => {
    const current = platform.session();
    if (current?.role === 'teacher') return duel.teacherId === current.teacherId;
    if (current?.role === 'student') return duel.invitedIds.includes(current.studentId);
    return false;
  };

  const myStudentId = (): string => {
    const current = platform.session();
    if (current?.role !== 'student') throw new AppError('FORBIDDEN');
    return current.studentId;
  };

  const requireVisible = async (id: string): Promise<Owned<Duel>> => {
    const duel = (await listAll()).find((candidate) => candidate.id === id && isVisible(candidate));
    if (!duel) throw new AppError('DUEL_NOT_FOUND');
    return duel;
  };

  const players = async (duelId: string): Promise<DuelParticipant[]> => {
    const keys = await store.keys(KEYS.duelPlayersPrefix(duelId));
    const rows = await Promise.all(keys.map((key) => store.get<DuelParticipant>(key)));
    return rows.filter((row): row is DuelParticipant => row !== null);
  };

  const savePlayer = (participant: DuelParticipant) =>
    store.set(`${KEYS.duelPlayersPrefix(participant.duelId)}${participant.studentId}`, participant);

  /** Only the host drives a duel — or anyone it invited, once it has timed out. */
  const assertCanDrive = async (duel: Owned<Duel>, allowStale = false) => {
    const studentId = myStudentId();
    if (duel.hostId === studentId) return;
    if (allowStale && isDuelStale(duel, new Date()) && duel.invitedIds.includes(studentId)) return;
    throw new AppError('FORBIDDEN');
  };

  const write = async (duel: Owned<Duel>) => {
    const all = await listAll();
    await store.set(
      KEYS.duelsList,
      all.map((candidate) => (candidate.id === duel.id ? duel : candidate)),
    );
  };

  return {
    async listRecent(limit) {
      return (await listAll())
        .filter(isVisible)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)
        .map(withoutOwner<Duel>);
    },

    async getById(id) {
      const duel = (await listAll()).find((candidate) => candidate.id === id && isVisible(candidate));
      return duel ? withoutOwner<Duel>(duel) : null;
    },

    async open(duel) {
      const studentId = myStudentId();
      const teacherId = platform.myTeacherId();
      if (duel.hostId !== studentId) throw new AppError('FORBIDDEN');
      if (!hasFeature(await platform.featuresOf(teacherId), 'duels')) throw new AppError('FEATURE_DISABLED');

      const classmates = await platform.visibleStudentIds();
      if (duel.invitedIds.some((id) => !classmates.has(id))) throw new AppError('STUDENT_NOT_FOUND');
      const open = await platform.openStudentIds();
      if (duel.invitedIds.some((id) => !open.has(id))) throw new AppError('DUEL_GUEST_UNAVAILABLE');

      await store.set(KEYS.duelsList, [...(await listAll()), { ...duel, teacherId: teacherId ?? undefined }]);
      // The host plays too, so their row exists from the start.
      await savePlayer({
        duelId: duel.id,
        studentId,
        joinedAt: duel.createdAt,
        answered: 0,
        correct: 0,
        answerMs: 0,
      });
    },

    async join(participant) {
      const studentId = myStudentId();
      if (participant.studentId !== studentId) throw new AppError('FORBIDDEN');
      const duel = await requireVisible(participant.duelId);
      if (duel.status !== 'lobby') throw new AppError('DUEL_CLOSED');
      await savePlayer(participant);
    },

    async start(id, startedAt) {
      const duel = await requireVisible(id);
      await assertCanDrive(duel);
      if (duel.status !== 'lobby') throw new AppError('DUEL_CLOSED');
      await write({ ...duel, status: 'running', round: 0, startedAt, updatedAt: startedAt });
    },

    async setRound(id, round) {
      const duel = await requireVisible(id);
      await assertCanDrive(duel);
      if (duel.status !== 'running') throw new AppError('DUEL_NOT_RUNNING');
      await write({ ...duel, round, updatedAt: new Date().toISOString() });
    },

    async finish(id) {
      const duel = await requireVisible(id);
      await assertCanDrive(duel, true);
      if (duel.status === 'finished') throw new AppError('DUEL_CLOSED');
      const now = new Date().toISOString();
      await write({ ...duel, status: 'finished', finishedAt: now, updatedAt: now });

      // What the database trigger writes: a result per player who answered at least one round.
      const played = (await players(id)).filter((participant) => participant.answered > 0);
      const stored = (await store.get<PracticeResult[]>(KEYS.results)) ?? [];
      await store.set(KEYS.results, [
        ...stored,
        ...played.map((participant): PracticeResult => ({
          id: crypto.randomUUID(),
          studentId: participant.studentId,
          completedAt: now,
          config: duel.configs[participant.studentId],
          correct: participant.correct,
          total: participant.answered,
          mode: 'duel',
          roomId: null,
        })),
      ]);
    },

    async listParticipants(duelIds) {
      const visible = new Set((await listAll()).filter(isVisible).map((duel) => duel.id));
      const lists = await Promise.all(duelIds.filter((id) => visible.has(id)).map(players));
      return lists.flat();
    },

    async saveProgress(progress) {
      if (progress.studentId !== myStudentId()) throw new AppError('FORBIDDEN');
      const duel = await requireVisible(progress.duelId);
      if (duel.status !== 'running') throw new AppError('DUEL_NOT_RUNNING');
      await savePlayer(progress);
    },

    subscribe: (listener) =>
      store.subscribe((key) => keyMatches(key, (k) => k.startsWith(KEYS.duelsPrefix)) && listener()),
  };
}
