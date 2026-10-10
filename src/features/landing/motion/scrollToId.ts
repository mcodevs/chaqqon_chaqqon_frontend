import type { MouseEvent } from 'react';
import { prefersReducedMotion } from './usePrefersReducedMotion';

/**
 * Brings a section to the top of the screen: smoothly, or at once for a visitor who asked for less
 * motion (global.css cannot reach a scroll started from JS). `focusId` then moves keyboard and
 * screen-reader focus there too, without a second jump. Works outside React: nav links, the apply
 * buttons and "Abakusni ko'rish ↓" all call it from click handlers.
 */
export function scrollToId(id: string, { focusId }: { focusId?: string } = {}): void {
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  if (focusId) document.getElementById(focusId)?.focus({ preventScroll: true });
}

/** A plain click: one with a modifier key or another button keeps the browser's own link behaviour. */
export function isPlainClick(event: MouseEvent<HTMLElement>): boolean {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/**
 * The heading that names a section (`aria-labelledby`), made focusable without joining the tab
 * order. Focus lands there with the scroll, so the next Tab continues inside the section instead of
 * back where the link was. (A prevented link click no longer moves the focus start point itself.)
 */
export function sectionHeadingId(section: HTMLElement): string | undefined {
  const headingId = section.getAttribute('aria-labelledby')?.split(' ')[0];
  const heading = headingId ? document.getElementById(headingId) : null;
  if (!heading) return undefined;
  if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
  return headingId;
}
