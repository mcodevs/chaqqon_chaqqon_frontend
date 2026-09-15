import {
  MAX_ROOM_PARTICIPANTS,
  type Room,
  type RoomProgress,
  emptyProgress,
} from '@/domain/competition';
import type { PracticeConfig } from '@/domain/practice/config';
import { AppError } from './errors';
import type { ChangeListener, Clock, IdGenerator, RoomRepository, Unsubscribe } from './ports';

interface CompetitionDependencies {
  rooms: RoomRepository;
  generateId: IdGenerator;
  clock: Clock;
}

export interface RoomSnapshot {
  /** The active room, or null when none is open. */
  room: Room | null;
  progress: Record<string, RoomProgress>;
}

export interface OpenRoomInput {
  participantIds: string[];
  configs: Record<string, PracticeConfig>;
}

export interface ProgressUpdate {
  answered: number;
  correct: number;
  finished: boolean;
}

export function createCompetitionService({ rooms, generateId, clock }: CompetitionDependencies) {
  const requireRoom = async (roomId: string): Promise<Room> => {
    const room = await rooms.getById(roomId);
    if (!room) throw new AppError('ROOM_NOT_FOUND');
    return room;
  };

  const getRoomProgress = async (room: Room): Promise<Record<string, RoomProgress>> => {
    const stored = await rooms.listProgress(room.id);
    return Object.fromEntries(
      room.participantIds.map((id) => [
        id,
        stored.find((p) => p.studentId === id) ?? emptyProgress(room, id),
      ]),
    );
  };

  return {
    subscribe: (listener: ChangeListener): Unsubscribe => rooms.subscribe(listener),

    /** Returns snapshots for all active rooms (for teacher monitoring). */
    async getActiveRooms(): Promise<RoomSnapshot[]> {
      const active = await rooms.listActive();
      return Promise.all(
        active.map(async (room) => ({
          room,
          progress: await getRoomProgress(room),
        })),
      );
    },

    /**
     * Returns the active room for a given student, or the latest active room if no studentId is given.
     */
    async getSnapshot(studentId?: string): Promise<RoomSnapshot> {
      const active = await rooms.listActive();
      const room = studentId
        ? active.find((r) => r.participantIds.includes(studentId)) ?? null
        : (active[0] ?? null);

      if (!room) return { room: null, progress: {} };
      const progress = await getRoomProgress(room);
      return { room, progress };
    },

    async open({ participantIds, configs }: OpenRoomInput): Promise<Room> {
      const uniqueIds = [...new Set(participantIds)];
      if (uniqueIds.length === 0) throw new AppError('ROOM_EMPTY');
      if (uniqueIds.length > MAX_ROOM_PARTICIPANTS) throw new AppError('ROOM_TOO_LARGE');

      const room: Room = {
        id: generateId(),
        createdAt: clock.now().toISOString(),
        status: 'waiting',
        participantIds: uniqueIds,
        configs: Object.fromEntries(
          uniqueIds.map((id) => {
            const config = configs[id];
            if (!config) throw new Error(`Missing practice config for participant ${id}`);
            return [id, config];
          }),
        ),
      };
      await rooms.save(room);
      return room;
    },

    async start(roomId: string): Promise<void> {
      const room = await requireRoom(roomId);
      if (room.status !== 'waiting') return;
      await rooms.save({ ...room, status: 'running' });
    },

    async close(roomId: string): Promise<void> {
      const room = await requireRoom(roomId);
      await rooms.save({ ...room, status: 'finished' });
    },

    async reportProgress(roomId: string, studentId: string, update: ProgressUpdate): Promise<void> {
      const room = await requireRoom(roomId);
      if (room.status !== 'running') throw new AppError('ROOM_NOT_RUNNING');
      if (!room.participantIds.includes(studentId)) throw new AppError('ROOM_NOT_FOUND');

      await rooms.saveProgress({ ...emptyProgress(room, studentId), ...update });
    },
  };
}

export type CompetitionService = ReturnType<typeof createCompetitionService>;
