import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

// One list for the page: it stays live, and every render reads its snapshot.
let query: MediaQueryList | null | undefined;

function mediaQuery(): MediaQueryList | null {
  if (query === undefined) {
    query =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(QUERY)
        : null;
  }
  return query;
}

function subscribe(onChange: () => void): () => void {
  const query = mediaQuery();
  query?.addEventListener('change', onChange);
  return () => query?.removeEventListener('change', onChange);
}

/**
 * The visitor's motion preference, read at call time. For code outside render (a scroll, a timer
 * started from a click), where a hook's value could be one change stale.
 */
export function prefersReducedMotion(): boolean {
  return mediaQuery()?.matches ?? false;
}

/**
 * Whether the visitor asked for less motion, live. global.css already stills every CSS animation
 * then, but not JS timers, rAF or smooth scrolling: each of those checks this instead.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => false);
}
