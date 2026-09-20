/*
 * Theme choice. Light is the default — the app has always looked like this, and a
 * classroom projector reads better on it; dark is opt-in, and "system" follows the device.
 */
export type ThemePreference = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'chaqqon.theme';
export const DEFAULT_THEME: ThemePreference = 'light';

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function readStoredTheme(storage: Pick<Storage, 'getItem'>): ThemePreference {
  try {
    const stored = storage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : DEFAULT_THEME;
  } catch {
    // Private mode or blocked storage: fall back rather than break the app.
    return DEFAULT_THEME;
  }
}

/**
 * Writes the choice onto <html>. "system" removes the attribute so the media query in
 * tokens.css takes over; the other two pin it.
 */
export function applyTheme(root: HTMLElement, preference: ThemePreference): void {
  if (preference === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', preference);
}
