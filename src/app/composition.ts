import type { AppServices } from '@/application/appServices';
import { createAuthService } from '@/application/authService';
import { createCompetitionService } from '@/application/competitionService';
import type { Clock, Ports } from '@/application/ports';
import { createResultService } from '@/application/resultService';
import { createStudentService } from '@/application/studentService';
import { createLocalPorts } from '@/infrastructure/local';
import { type BackendConfig, readBackendConfig } from './config';

/** Composition root: the only place that knows which backend implements the ports. */
export async function createAppServices(config: BackendConfig = readBackendConfig()): Promise<AppServices> {
  const ports = await createPorts(config);
  const generateId = () => crypto.randomUUID();
  const clock: Clock = { now: () => new Date() };

  return {
    auth: createAuthService({ gateway: ports.auth }),
    students: createStudentService({ students: ports.students, random: Math.random }),
    results: createResultService({ results: ports.results, generateId, clock }),
    competition: createCompetitionService({ rooms: ports.rooms, generateId, clock }),
  };
}

/** The Supabase SDK is downloaded only when that backend is configured. */
async function createPorts(config: BackendConfig): Promise<Ports> {
  if (config.kind === 'local') return createLocalPorts(window);

  const { createSupabasePorts } = await import('@/infrastructure/supabase');
  return createSupabasePorts({ url: config.url, publishableKey: config.publishableKey });
}
