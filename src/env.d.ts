/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface TelegramSafeAreaInset {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/** Minimal shape of the Telegram Mini App SDK we rely on (telegram-web-app.js). */
interface TelegramWebApp {
  initData: string;
  ready(): void;
  expand(): void;
  /** Bot API 8.0+, phones only. Absent on older clients and on desktop. */
  requestFullscreen?(): void;
  /** Bot API 7.7+. Stops a downward swipe from closing the app mid-task. */
  disableVerticalSwipes?(): void;
  /** Device notch/rounded-corner insets (Bot API 8.0+). */
  safeAreaInset?: TelegramSafeAreaInset;
  /** Insets taken by Telegram's own UI (fullscreen header/close). Bot API 8.0+. */
  contentSafeAreaInset?: TelegramSafeAreaInset;
  onEvent?(event: string, handler: () => void): void;
}

interface Window {
  Telegram?: { WebApp?: TelegramWebApp };
}
