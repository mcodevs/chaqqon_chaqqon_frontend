import type { Ports } from '@/application/ports';
import { type SupabaseConfig, createSupabaseClient } from './client';
import { createSupabaseAuthGateway } from './supabaseAuthGateway';
import { createSupabaseHomeworkRepository } from './supabaseHomeworkRepository';
import { createSupabasePaymentRepository } from './supabasePaymentRepository';
import {
  createSupabaseMarketRepository,
  createSupabaseResultRepository,
  createSupabaseRoomRepository,
} from './supabasePracticeRepositories';
import { createSupabaseStorageGateway } from './supabaseStorageGateway';
import { createSupabaseStudentRepository } from './supabaseStudentRepository';
import { createSupabaseTelegramGateway } from './supabaseTelegramGateway';

/** Backend on Supabase: Auth for accounts, Postgres + RLS for data, Realtime for live updates. */
export function createSupabasePorts(config: SupabaseConfig): Ports {
  const client = createSupabaseClient(config);

  return {
    auth: createSupabaseAuthGateway(client),
    students: createSupabaseStudentRepository(client),
    results: createSupabaseResultRepository(client),
    rooms: createSupabaseRoomRepository(client),
    payments: createSupabasePaymentRepository(client),
    market: createSupabaseMarketRepository(client),
    homework: createSupabaseHomeworkRepository(client),
    storage: createSupabaseStorageGateway(client),
    telegram: createSupabaseTelegramGateway(client, window),
  };
}
