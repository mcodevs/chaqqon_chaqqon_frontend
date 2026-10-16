import type { Payment } from '@/domain/billing';
import type { Room, RoomProgress } from '@/domain/competition';
import type { Duel, DuelParticipant } from '@/domain/duel';
import type { Problem } from '@/domain/practice/problem';
import type { MarketItem, MarketOrder, StarAward } from '@/domain/market';
import { type PracticeConfig, normalizePracticeConfig } from '@/domain/practice/config';
import { type PracticeResult, resolvePracticeMode } from '@/domain/results';
import type { WrittenHomework } from '@/domain/homework';
import type { TariffInput } from '@/application/ports';
import type { TeacherApplication } from '@/domain/applications';
import type { TeacherOverview } from '@/domain/platformStats';
import { type LedgerEntry, type Tariff, isFeature } from '@/domain/teacherBilling';
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
  if (row.last_active_at !== undefined && row.last_active_at !== null)
    student.lastActiveAt = row.last_active_at;
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

export function toStarAward(row: Tables['star_awards']['Row']): StarAward {
  return {
    id: row.id,
    studentId: row.student_id,
    delta: row.delta,
    reason: row.reason,
    sourceResultId: row.source_result_id,
    sourceOrderId: row.source_order_id,
    note: row.note,
    createdAt: row.created_at,
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

export function toDuel(row: Tables['duels']['Row']): Duel {
  const configs = isJsonObject(row.configs) ? row.configs : {};
  const problems = isJsonObject(row.problems) ? row.problems : {};
  return {
    id: row.id,
    hostId: row.host_id,
    status: row.status,
    invitedIds: row.invited_ids,
    configs: Object.fromEntries(row.invited_ids.map((id) => [id, normalizePracticeConfig(configs[id])])),
    problems: Object.fromEntries(row.invited_ids.map((id) => [id, toProblems(problems[id])])),
    sameConfig: row.same_config,
    roundCount: row.round_count,
    round: row.round,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    updatedAt: row.updated_at,
  };
}

export function toDuelRow(duel: Duel): Tables['duels']['Insert'] {
  return {
    id: duel.id,
    host_id: duel.hostId,
    invited_ids: duel.invitedIds,
    configs: toJson(duel.configs),
    problems: duel.problems as unknown as Json,
    same_config: duel.sameConfig,
    round_count: duel.roundCount,
  };
}

export function toDuelParticipant(row: Tables['duel_participants']['Row']): DuelParticipant {
  return {
    duelId: row.duel_id,
    studentId: row.student_id,
    joinedAt: row.joined_at,
    answered: row.answered,
    correct: row.correct,
    answerMs: row.answer_ms,
  };
}

/** A duel's problems are drawn once and never written again, so only the join sends a row. */
export function toDuelParticipantRow(participant: DuelParticipant): Tables['duel_participants']['Insert'] {
  return {
    duel_id: participant.duelId,
    student_id: participant.studentId,
    joined_at: participant.joinedAt,
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

/** A tariff row; feature names the app no longer knows are dropped. */
export function toTariff(row: Tables['tariffs']['Row']): Tariff {
  return {
    id: row.id,
    name: row.name,
    monthlyPrice: Number(row.monthly_price),
    maxStudents: row.max_students,
    features: row.features.filter(isFeature),
    description: row.description,
    isPublic: row.is_public,
    isFeatured: row.is_featured,
    sortOrder: row.sort_order,
    archivedAt: row.archived_at,
  };
}

export function toTariffRow(input: TariffInput) {
  return {
    name: input.name,
    monthly_price: input.monthlyPrice,
    max_students: input.maxStudents,
    features: input.features,
    description: input.description,
    is_public: input.isPublic,
    is_featured: input.isFeatured,
    sort_order: input.sortOrder,
  };
}

export function toLedgerEntry(row: Tables['teacher_ledger']['Row']): LedgerEntry {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    kind: row.kind,
    amount: Number(row.amount),
    periodStart: row.period_start,
    tariffId: row.tariff_id,
    note: row.note,
    createdAt: row.created_at,
  };
}

export function toTeacherOverview(
  row: Database['public']['Functions']['admin_teacher_overview']['Returns'][number],
): TeacherOverview {
  return {
    id: row.id,
    username: row.username,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    centerName: row.center_name,
    tariffId: row.tariff_id,
    billingStartsOn: row.billing_starts_on,
    disabledAt: row.disabled_at,
    createdAt: row.created_at,
    studentCount: row.student_count,
    activeStudents: row.active_students,
    openStudents: row.open_students,
    newStudents: row.new_students,
    practiceCount: row.practice_count,
    correctAnswers: row.correct_answers,
    totalAnswers: row.total_answers,
    homeworkRooms: row.homework_rooms,
  };
}

export function toTeacherApplication(row: Tables['teacher_applications']['Row']): TeacherApplication {
  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    studentsCount: row.students_count,
    telegramUsername: row.telegram_username,
    city: row.city,
    centerName: row.center_name,
    heardFrom: row.heard_from,
    tariffId: row.tariff_id,
    note: row.note,
    referrerUsername: row.referrer_username,
    status: row.status,
    teacherId: row.teacher_id,
    adminNote: row.admin_note,
    createdAt: row.created_at,
  };
}

/** The problems stored with a duel. A row the app did not write reads as an empty list. */
function toProblems(value: Json | undefined): Problem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isJsonObject(entry)) return [];
    const { numbers, answer } = entry;
    if (!Array.isArray(numbers) || typeof answer !== 'number') return [];
    const rows = numbers.filter((number): number is number => typeof number === 'number');
    return rows.length === numbers.length ? [{ numbers: rows, answer }] : [];
  });
}

function isJsonObject(value: Json): value is { [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Practice configs are plain JSON-safe data; this only widens the type for the column. */
function toJson(value: PracticeConfig | Record<string, PracticeConfig>): Json {
  return value as unknown as Json;
}
