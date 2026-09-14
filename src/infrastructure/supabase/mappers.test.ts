import { describe, expect, it } from 'vitest';
import type { Room } from '@/domain/competition';
import { DEFAULT_PRACTICE_CONFIG } from '@/domain/practice/config';
import type { PracticeResult } from '@/domain/results';
import {
  toPracticeResult,
  toPracticeResultRow,
  toRoom,
  toRoomProgress,
  toRoomProgressRow,
  toRoomRow,
  toStudentAccount,
} from './mappers';

const room: Room = {
  id: 'room-1',
  createdAt: '2026-09-13T10:00:00.000Z',
  status: 'running',
  participantIds: ['a', 'b'],
  configs: { a: DEFAULT_PRACTICE_CONFIG, b: { ...DEFAULT_PRACTICE_CONFIG, section: 'katta' } },
};

describe('supabase mappers', () => {
  it('round-trips rooms, progress and results', () => {
    expect(toRoom({ ...toRoomRow(room), id: room.id, created_at: room.createdAt } as never)).toEqual(room);

    const progress = { roomId: 'room-1', studentId: 'a', answered: 2, correct: 1, total: 5, finished: false };
    expect(toRoomProgress(toRoomProgressRow(progress) as never)).toEqual(progress);

    const result: PracticeResult = {
      id: 'r1',
      studentId: 'a',
      completedAt: room.createdAt,
      config: DEFAULT_PRACTICE_CONFIG,
      correct: 4,
      total: 5,
      mode: 'classroom',
      roomId: null,
    };
    expect(toPracticeResult(toPracticeResultRow(result) as never)).toEqual(result);
  });

  it('infers the mode of rows saved before modes existed', () => {
    const legacyRow = {
      id: 'r2',
      student_id: 'a',
      completed_at: room.createdAt,
      config: DEFAULT_PRACTICE_CONFIG,
      correct: 1,
      total: 5,
      room_id: 'room-1',
    };
    expect(toPracticeResult(legacyRow as never).mode).toBe('online');
  });

  it('repairs configs that are missing or outdated', () => {
    const parsed = toRoom({
      id: 'room-2',
      created_at: room.createdAt,
      status: 'waiting',
      participant_ids: ['a', 'b'],
      configs: { a: { section: 'miks', rowCount: 99, secondsPerNumber: 12, digitCount: 2 } },
    });
    expect(parsed.configs.a).toEqual({
      ...DEFAULT_PRACTICE_CONFIG,
      section: 'miks',
      rowCount: 10,
      secondsPerNumber: 7,
    });
    expect(parsed.configs.b).toEqual(DEFAULT_PRACTICE_CONFIG);
  });

  it('maps student accounts from snake_case rows', () => {
    expect(
      toStudentAccount({ id: 's1', username: 'ali10', first_name: 'Ali', last_name: 'Valiyev', age: 8 }),
    ).toEqual({ id: 's1', username: 'ali10', firstName: 'Ali', lastName: 'Valiyev', age: 8 });
  });
});
