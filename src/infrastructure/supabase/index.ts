import type { Ports } from '@/application/ports';
import { type SupabaseConfig, createSupabaseClient } from './client';
import { createSupabaseAuthGateway } from './supabaseAuthGateway';
import { createSupabasePaymentRepository } from './supabasePaymentRepository';
import {
  createSupabaseMarketRepository,
  createSupabaseResultRepository,
  createSupabaseRoomRepository,
} from './supabasePracticeRepositories';
import { createSupabaseStudentRepository } from './supabaseStudentRepository';

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
  };
}
