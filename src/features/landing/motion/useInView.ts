import { type RefObject, useEffect, useState } from 'react';

/*
 * Visibility for the whole landing page without a single scroll listener. Every watch with the same
 * threshold and margin shares one IntersectionObserver, held here for the life of the page, so ten
 * cards cost one observer, not ten.
 */

export interface WatchOptions {
  /** Share of the element that must be on screen, 0…1. Keep it small for anything taller than a phone screen. */
  threshold?: number;
  /** Grows or shrinks the screen edges; the default ends a little above the bottom, so a thing is "seen" once it is really on screen. */
  rootMargin?: string;
}

export interface InViewOptions extends WatchOptions {
  /** Stops at the first sighting (the default); false follows the element in and out. */
  once?: boolean;
}

/** Gets every entry of the element; `stop` ends this one watch and is safe to call more than once. */
export type InViewListener = (entry: IntersectionObserverEntry, stop: () => void) => void;

export const DEFAULT_IN_VIEW = { threshold: 0.15, rootMargin: '0px 0px -8% 0px' } as const;

interface SharedObserver {
  observer: IntersectionObserver;
  watches: Map<Element, Set<(entry: IntersectionObserverEntry) => void>>;
  /** The last entry per element, for a watch that joins after the observer's first report on it. */
  latest: Map<Element, IntersectionObserverEntry>;
}

const observers = new Map<string, SharedObserver>();

/** False in old browsers and tests: callers then show everything as already seen. */
export function supportsInView(): boolean {
  return typeof IntersectionObserver !== 'undefined';
}

/** An entry counts once the threshold share is visible, not at the first visible pixel. */
export function isInView(entry: IntersectionObserverEntry, threshold: number): boolean {
  return entry.isIntersecting && entry.intersectionRatio >= threshold;
}

function sharedObserver(threshold: number, rootMargin: string): SharedObserver {
  const key = `${threshold}|${rootMargin}`;
  const existing = observers.get(key);
  if (existing) return existing;

  const watches: SharedObserver['watches'] = new Map();
  const latest: SharedObserver['latest'] = new Map();
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        latest.set(entry.target, entry);
        // A copy, because a watch may stop itself while the set is being walked.
        for (const watch of [...(watches.get(entry.target) ?? [])]) watch(entry);
      }
    },
    { threshold, rootMargin },
  );

  const shared = { observer, watches, latest };
  observers.set(key, shared);
  return shared;
}

/**
 * Watches one element outside React, or several at once (the sticky bar watches four sections by
 * id). Returns the stop function. Does nothing where IntersectionObserver is missing.
 */
export function watchInView(
  element: Element,
  listener: InViewListener,
  options: WatchOptions = {},
): () => void {
  if (!supportsInView()) return () => undefined;

  const { threshold = DEFAULT_IN_VIEW.threshold, rootMargin = DEFAULT_IN_VIEW.rootMargin } = options;
  const { observer, watches, latest } = sharedObserver(threshold, rootMargin);

  let active = true;
  const stop = () => {
    if (!active) return;
    active = false;
    const forElement = watches.get(element);
    forElement?.delete(watch);
    if (forElement?.size === 0) {
      watches.delete(element);
      latest.delete(element);
      observer.unobserve(element);
    }
  };
  const watch = (entry: IntersectionObserverEntry) => {
    if (active) listener(entry, stop);
  };

  const forElement = watches.get(element);
  if (forElement) {
    forElement.add(watch);
    // Already observed, so no first report is coming for this watch: hand it the last one.
    const entry = latest.get(element);
    if (entry) watch(entry);
  } else {
    watches.set(element, new Set([watch]));
    observer.observe(element);
  }

  return stop;
}

/**
 * True once the element behind `ref` is on screen (with `once`), or while it is (without). The
 * element must be rendered together with the component that calls this.
 */
export function useInView(
  ref: RefObject<Element | null>,
  {
    threshold = DEFAULT_IN_VIEW.threshold,
    rootMargin = DEFAULT_IN_VIEW.rootMargin,
    once = true,
  }: InViewOptions = {},
): boolean {
  // Without the API nothing would ever report in, so everything counts as seen from the start.
  const [inView, setInView] = useState(() => !supportsInView());

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    return watchInView(
      element,
      (entry, stop) => {
        const seen = isInView(entry, threshold);
        if (!once) setInView(seen);
        else if (seen) {
          setInView(true);
          stop();
        }
      },
      { threshold, rootMargin },
    );
  }, [ref, threshold, rootMargin, once]);

  return inView;
}
