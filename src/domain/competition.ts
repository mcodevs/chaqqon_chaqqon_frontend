import type { PracticeConfig } from './practice/config';

export const MAX_ROOM_PARTICIPANTS = 5;

export type RoomStatus = 'waiting' | 'running' | 'finished';

export interface Room {
  id: string;
  createdAt: string;
  status: RoomStatus;
  participantIds: string[];
  /** Resolved practice config for every participant. */
  configs: Record<string, PracticeConfig>;
}

/**
 * Stored separately per participant so concurrent students never overwrite
 * each other's progress.
 */
export interface RoomProgress {
  roomId: string;
  studentId: string;
  answered: number;
  correct: number;
  total: number;
  finished: boolean;
}

export function isRoomActive(room: Room | null): room is Room {
  return room !== null && room.status !== 'finished';
}

export function emptyProgress(room: Room, studentId: string): RoomProgress {
  return {
    roomId: room.id,
    studentId,
    answered: 0,
    correct: 0,
    total: room.configs[studentId]?.problemCount ?? 0,
    finished: false,
  };
}
