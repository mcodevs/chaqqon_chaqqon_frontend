import type { Payment } from '@/domain/billing';
import type { Room, RoomProgress } from '@/domain/competition';
import type { MarketItem, MarketOrder } from '@/domain/market';
import { type PracticeConfig, normalizePracticeConfig } from '@/domain/practice/config';
import { type PracticeResult, resolvePracticeMode } from '@/domain/results';
import type { WrittenHomework } from '@/domain/homework';
import type { Student, StudentAccount } from '@/domain/users';
import type { Database, Json } from './database.types';

type Tables = Database['public']['Tables'];
type ProfileRow = Pick<Tables['profiles']['Row'], 'id' | 'first_name' | 'last_name'> &
  Partial<Pick<Tables['profiles']['Row'], 'birth_year' | 'level_group' | 'avatar_url' | 'last_active_at'>>;
type StudentAccountRow = ProfileRow & { username: string };

export function toStudent(row: ProfileRow): Student {
  const student: Student = {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
  };
  if (row.birth_year !== undefined && row.birth_year !== null) student.birthYear = row.birth_year;
  if (row.level_group !== undefined && row.level_group !== null) student.levelGroup = row.level_group;
  if (row.avatar_url !== undefined && row.avatar_url !== null) student.avatarUrl = row.avatar_url;
  if (row.last_active_at !== undefined && row.last_active_at !== null) student.lastActiveAt = row.last_active_at;
  return student;
}

export function toStudentAccount(row: StudentAccountRow): StudentAccount {
  return { ...toStudent(row), username: row.username };
}

export function toWrittenHomework(row: Tables['written_homework']['Row']): WrittenHomework {
  return {
    id: row.id,
    studentId: row.student_id,
    date: row.date,
    status: row.status,
    notes: row.notes,
    updatedAt: row.updated_at,
  };
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

export function toPayment(row: Tables['student_payments']['Row']): Payment {
  return {
    id: row.id,
    studentId: row.student_id,
    recordedAt: row.recorded_at,
    paidUntil: row.paid_until,
    kind: row.kind,
  };
}

export function toMarketItem(row: Tables['market_items']['Row']): MarketItem {
  return {
    id: row.id,
    title: row.title,
    costStars: row.cost_stars,
    imageUrl: row.image_url,
    stock: row.stock,
    createdAt: row.created_at,
  };
}

export function toMarketItemRow(item: MarketItem): Tables['market_items']['Insert'] {
  return {
    id: item.id,
    title: item.title,
    cost_stars: item.costStars,
    image_url: item.imageUrl,
    stock: item.stock,
    created_at: item.createdAt,
  };
}

export function toMarketOrder(row: Tables['market_orders']['Row']): MarketOrder {
  return {
    id: row.id,
    studentId: row.student_id,
    itemId: row.item_id,
    itemTitle: row.item_title,
    costStars: row.cost_stars,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function toMarketOrderRow(order: MarketOrder): Tables['market_orders']['Insert'] {
  return {
    id: order.id,
    student_id: order.studentId,
    item_id: order.itemId,
    item_title: order.itemTitle,
    cost_stars: order.costStars,
    status: order.status,
    created_at: order.createdAt,
  };
}

function isJsonObject(value: Json): value is { [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Practice configs are plain JSON-safe data; this only widens the type for the column. */
function toJson(value: PracticeConfig | Record<string, PracticeConfig>): Json {
  return value as unknown as Json;
}
