import {
  type ApplicationInput,
  type ApplicationStatus,
  applicationProblem,
  normalizeReferrer,
} from '@/domain/applications';
import { AppError } from './errors';
import type { ApplicationRepository } from './ports';

interface ApplicationDependencies {
  applications: ApplicationRepository;
}

export function createApplicationService({ applications }: ApplicationDependencies) {
  return {
    async submit(input: ApplicationInput): Promise<void> {
      const clean: ApplicationInput = {
        ...input,
        fullName: input.fullName.trim(),
        phone: input.phone.trim(),
        telegramUsername: input.telegramUsername.trim(),
        city: input.city.trim(),
        centerName: input.centerName.trim(),
        heardFrom: input.heardFrom.trim(),
        note: input.note.trim(),
        referrerUsername: normalizeReferrer(input.referrerUsername),
      };
      if (applicationProblem(clean)) throw new AppError('INVALID_APPLICATION');
      await applications.submit(clean);
    },

    list: () => applications.list(),

    setStatus: (id: string, status: ApplicationStatus, teacherId?: string | null) =>
      applications.update(id, teacherId === undefined ? { status } : { status, teacherId }),

    subscribe: applications.subscribe,
  };
}

export type ApplicationService = ReturnType<typeof createApplicationService>;
