import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/** Fast at first, settling softly on the number, the way a counter "lands". */
export function easeOutCubic(progress: number): number {
  const t = Math.min(1, Math.max(0, progress));
  return 1 - (1 - t) ** 3;
}

/** The whole number shown `progress` (0…1) of the way from `from` to `to`; exactly `to` at the end. */
export function countUpValue(from: number, to: number, progress: number): number {
  return progress >= 1 ? to : Math.round(from + (to - from) * easeOutCubic(progress));
}

/**
 * A number that counts up to `target` once `start` turns true (usually from useInView), and 0
 * before that. Under reduced motion it is the target from the start. A later change of target
 * counts on from the number on screen. Render the result `aria-hidden` and the final value in a
 * visually hidden span: a screen reader should hear the number once, not every frame.
 */
export function useCountUp(target: number, start: boolean, durationMs = 900): number {
  const reduced = usePrefersReducedMotion();
  const [value, setValue] = useState(0);
  const shown = useRef(0);

  useEffect(() => {
    if (!start || reduced) return;
    const from = shown.current;
    if (from === target) return;

    let frame = 0;
    const begin = performance.now();
    const tick = (now: number) => {
      const next = countUpValue(from, target, (now - begin) / durationMs);
      shown.current = next;
      setValue(next);
      if (next !== target) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, start, reduced, durationMs]);

  return reduced ? target : value;
}
