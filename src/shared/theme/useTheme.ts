import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  type ThemePreference,
  applyTheme,
  readStoredTheme,
} from './theme';

/** The chosen theme plus a setter that stores it and applies it to the document. */
export function useTheme(): [ThemePreference, (next: ThemePreference) => void] {
  const [preference, setPreference] = useState<ThemePreference>(() =>
    typeof window === 'undefined' ? DEFAULT_THEME : readStoredTheme(window.localStorage),
  );

  useEffect(() => {
    applyTheme(document.documentElement, preference);
  }, [preference]);

  const choose = useCallback((next: ThemePreference) => {
    setPreference(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Not being able to remember the choice is not a reason to refuse it.
    }
  }, []);

  return [preference, choose];
}
