import type { AppServices } from '@/application/appServices';
import { createAuthService } from '@/application/authService';
import { createBillingService } from '@/application/billingService';
import { createCompetitionService } from '@/application/competitionService';
import { createMarketService } from '@/application/marketService';
import type { Clock, Ports } from '@/application/ports';
import { createResultService } from '@/application/resultService';
import { createStudentService } from '@/application/studentService';
import { createLocalPorts } from '@/infrastructure/local';
import { type BackendConfig, readBackendConfig } from './config';

/** Composition root: the only place that knows which backend implements the ports. */
export async function createAppServices(config: BackendConfig = readBackendConfig()): Promise<AppServices> {
  const generateId = () => crypto.randomUUID();
  const clock: Clock = { now: () => new Date() };
  const ports = await createPorts(config, clock);

  return {
    auth: createAuthService({ gateway: ports.auth }),
    students: createStudentService({ students: ports.students, random: Math.random }),
    results: createResultService({ results: ports.results, generateId, clock }),
    competition: createCompetitionService({ rooms: ports.rooms, generateId, clock }),
    billing: createBillingService({ payments: ports.payments, clock }),
    market: createMarketService({ market: ports.market, results: ports.results, generateId, clock }),
  };
}

/** The Supabase SDK is downloaded only when that backend is configured; it dates payments on the database clock. */
async function createPorts(config: BackendConfig, clock: Clock): Promise<Ports> {
  if (config.kind === 'local') return createLocalPorts(window, clock);

  const { createSupabasePorts } = await import('@/infrastructure/supabase');
  return createSupabasePorts({ url: config.url, publishableKey: config.publishableKey });
}
