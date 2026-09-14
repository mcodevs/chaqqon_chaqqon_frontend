import { useCallback, useEffect, useState } from 'react';

/**
 * Browser fullscreen for the whole page. Callers should lay out for the full window anyway:
 * fullscreen may be unsupported, refused, or left with Esc at any time.
 */
export function useFullscreen() {
  const [active, setActive] = useState(() => document.fullscreenElement !== null);

  useEffect(() => {
    const update = () => setActive(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  /** Browsers only allow this during a user gesture such as a click. */
  const enter = useCallback(async () => {
    if (!document.fullscreenEnabled || document.fullscreenElement) return;
    await document.documentElement.requestFullscreen().catch(() => undefined);
  }, []);

  const exit = useCallback(async () => {
    if (!document.fullscreenElement) return;
    await document.exitFullscreen().catch(() => undefined);
  }, []);

  return { supported: document.fullscreenEnabled, active, enter, exit };
}
