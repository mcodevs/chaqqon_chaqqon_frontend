/*
 * Thin, pure wrappers over the Telegram Mini App SDK (telegram-web-app.js),
 * kept free of any backend so they can be unit-tested with a fake window.
 * In an ordinary browser `window.Telegram` is absent and every helper is inert.
 */

/** The signed `initData` string when running inside Telegram, otherwise null. */
export function getTelegramInitData(win: Window): string | null {
  const initData = win.Telegram?.WebApp?.initData;
  return typeof initData === 'string' && initData.length > 0 ? initData : null;
}

/** True only inside the Telegram Mini App container. */
export function isTelegramMiniApp(win: Window): boolean {
  return getTelegramInitData(win) !== null;
}

/** Tells Telegram the app is ready and asks for the full viewport. No-op in a browser. */
export function initTelegramViewport(win: Window): void {
  const webApp = win.Telegram?.WebApp;
  if (!webApp) return;
  try {
    webApp.ready();
    webApp.expand();
  } catch {
    // The SDK is best-effort; never let it break app startup.
  }
}
