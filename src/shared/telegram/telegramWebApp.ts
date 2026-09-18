/**
 * Integration with Telegram WebApp SDK (Telegram Mini Apps).
 * Safely guards against running outside of Telegram (standard desktop/mobile web).
 */

export interface TelegramWebUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface TelegramWebAppAPI {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramWebUser;
    auth_date?: number;
    hash?: string;
    start_param?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  ready: () => void;
  expand: () => void;
  close: () => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  HapticFeedback?: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  BackButton?: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  MainButton?: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebAppAPI;
    };
  }
}

export function getTelegramWebApp(): TelegramWebAppAPI | null {
  const g = typeof window !== 'undefined' ? window : (globalThis as unknown as { Telegram?: { WebApp?: TelegramWebAppAPI } });
  return g?.Telegram?.WebApp ?? null;
}

/**
 * Returns true if running as a Telegram Mini App with a valid initData payload.
 */
export function isTelegramWebApp(): boolean {
  const tg = getTelegramWebApp();
  return Boolean(tg && typeof tg.initData === 'string' && tg.initData.length > 0);
}

/**
 * Returns the Telegram user passed by Telegram WebApp, or null if outside Telegram.
 */
export function getTelegramUser(): TelegramWebUser | null {
  const tg = getTelegramWebApp();
  return tg?.initDataUnsafe?.user ?? null;
}

/**
 * Returns the raw signed initData string for authentication verification.
 */
export function getTelegramInitData(): string | null {
  const tg = getTelegramWebApp();
  if (!tg || !tg.initData) return null;
  return tg.initData;
}

/**
 * Initializes the Mini App viewport and appearance.
 */
export function initTelegramApp(): void {
  const tg = getTelegramWebApp();
  if (!tg) return;

  try {
    tg.ready();
    tg.expand();
  } catch (err) {
    console.warn('Failed to initialize Telegram WebApp view:', err);
  }
}

export type HapticType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

/**
 * Triggers native Telegram haptic feedback if available.
 */
export function triggerHaptic(type: HapticType): void {
  const haptic = getTelegramWebApp()?.HapticFeedback;
  if (!haptic) return;

  try {
    if (type === 'light' || type === 'medium' || type === 'heavy') {
      haptic.impactOccurred(type);
    } else if (type === 'success' || type === 'warning' || type === 'error') {
      haptic.notificationOccurred(type);
    } else if (type === 'selection') {
      haptic.selectionChanged();
    }
  } catch {
    // Haptics not supported on device or failed silently
  }
}

/**
 * Binds Telegram's native BackButton to a callback (e.g. router navigation).
 * Returns a cleanup function.
 */
export function bindTelegramBackButton(onBack: () => void): () => void {
  const backButton = getTelegramWebApp()?.BackButton;
  if (!backButton) return () => {};

  try {
    backButton.onClick(onBack);
    backButton.show();
  } catch {
    // ignore
  }

  return () => {
    try {
      backButton.offClick(onBack);
      backButton.hide();
    } catch {
      // ignore
    }
  };
}
