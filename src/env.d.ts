/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
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
}

interface Window {
  Telegram?: { WebApp?: TelegramWebApp };
}
