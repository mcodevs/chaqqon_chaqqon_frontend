import type { PlatformSettings, PlatformSettingsRepository, TariffRepository } from './ports';

/** The longest free trial or money-back period the admin may offer, in days. Same as the SQL check. */
export const MAX_OFFER_DAYS = 90;

/** A platform that was never set up: no contact yet, and the offer the database starts with. */
export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  contactPhone: '',
  contactTelegram: '',
  trialDays: 14,
  moneyBackDays: 30,
  referralEnabled: true,
};

interface PlatformDependencies {
  tariffs: TariffRepository;
  settings: PlatformSettingsRepository;
}

/** What anyone may read about the platform: the tariffs on offer, the offer, how to reach the admin. */
export function createPlatformService({ tariffs, settings }: PlatformDependencies) {
  return {
    listOfferedTariffs: () => tariffs.listOffered(),
    subscribeTariffs: tariffs.subscribe,
    getSettings: () => settings.get(),
    publicStats: () => settings.publicStats(),
    subscribeSettings: settings.subscribe,
  };
}

export type PlatformService = ReturnType<typeof createPlatformService>;
