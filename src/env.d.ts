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
}

interface Window {
  Telegram?: { WebApp?: TelegramWebApp };
}
