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

/**
 * Tells Telegram the app is ready and claims as much screen as the client allows:
 * true immersive fullscreen on phones that support it (Bot API 8.0+), falling back
 * to the full-height expand elsewhere. No-op in a browser.
 */
export function initTelegramViewport(win: Window): void {
  const webApp = win.Telegram?.WebApp;
  if (!webApp) return;
  try {
    webApp.ready();
    webApp.expand();
    // Keep a downward swipe from closing the app while a child is mid-exercise.
    webApp.disableVerticalSwipes?.();
    // Immersive fullscreen where available; harmlessly absent on desktop/old clients.
    webApp.requestFullscreen?.();
  } catch {
    // The SDK is best-effort; never let it break app startup.
  }
}
