import type { Room, RoomProgress } from '@/domain/competition';
import { type PracticeConfig, normalizePracticeConfig } from '@/domain/practice/config';
import { type PracticeResult, resolvePracticeMode } from '@/domain/results';
import type { Student, StudentAccount } from '@/domain/users';
import type { Database, Json } from './database.types';

type Tables = Database['public']['Tables'];
type ProfileRow = Pick<Tables['profiles']['Row'], 'id' | 'first_name' | 'last_name' | 'age'>;
type StudentAccountRow = Database['public']['Functions']['student_accounts']['Returns'][number];

export function toStudent(row: ProfileRow): Student {
  return { id: row.id, firstName: row.first_name, lastName: row.last_name, age: row.age };
}

export function toStudentAccount(row: StudentAccountRow): StudentAccount {
  return { ...toStudent(row), username: row.username };
}

export function toPracticeResult(row: Tables['practice_results']['Row']): PracticeResult {
  return {
    id: row.id,
    studentId: row.student_id,
    completedAt: row.completed_at,
    config: normalizePracticeConfig(row.config),
    correct: row.correct,
    total: row.total,
    mode: resolvePracticeMode(row.mode, row.room_id),
    roomId: row.room_id,
  };
}

export function toPracticeResultRow(result: PracticeResult): Tables['practice_results']['Insert'] {
  return {
    id: result.id,
    student_id: result.studentId,
    completed_at: result.completedAt,
    config: toJson(result.config),
    correct: result.correct,
    total: result.total,
    mode: result.mode,
    room_id: result.roomId,
  };
}

export function toRoom(row: Tables['rooms']['Row']): Room {
  const configs = isJsonObject(row.configs) ? row.configs : {};
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status,
    participantIds: row.participant_ids,
    configs: Object.fromEntries(row.participant_ids.map((id) => [id, normalizePracticeConfig(configs[id])])),
  };
}

export function toRoomRow(room: Room): Tables['rooms']['Insert'] {
  return {
    id: room.id,
    created_at: room.createdAt,
    status: room.status,
    participant_ids: room.participantIds,
    configs: toJson(room.configs),
  };
}

export function toRoomProgress(row: Tables['room_progress']['Row']): RoomProgress {
  return {
    roomId: row.room_id,
    studentId: row.student_id,
    answered: row.answered,
    correct: row.correct,
    total: row.total,
    finished: row.finished,
  };
}

export function toRoomProgressRow(progress: RoomProgress): Tables['room_progress']['Insert'] {
  return {
    room_id: progress.roomId,
    student_id: progress.studentId,
    answered: progress.answered,
    correct: progress.correct,
    total: progress.total,
    finished: progress.finished,
  };
}

function isJsonObject(value: Json): value is { [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Practice configs are plain JSON-safe data; this only widens the type for the column. */
function toJson(value: PracticeConfig | Record<string, PracticeConfig>): Json {
  return value as unknown as Json;
}
