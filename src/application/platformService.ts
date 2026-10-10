import type { PlatformSettingsRepository, TariffRepository } from './ports';

interface PlatformDependencies {
  tariffs: TariffRepository;
  settings: PlatformSettingsRepository;
}

/** What anyone may read about the platform: the tariffs on offer and how to reach the admin. */
export function createPlatformService({ tariffs, settings }: PlatformDependencies) {
  return {
    listOfferedTariffs: () => tariffs.listOffered(),
    subscribeTariffs: tariffs.subscribe,
    getSettings: () => settings.get(),
    subscribeSettings: settings.subscribe,
  };
}

export type PlatformService = ReturnType<typeof createPlatformService>;
