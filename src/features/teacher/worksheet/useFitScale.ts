import { useEffect, useState } from 'react';

/** A4 width (210 mm) in CSS pixels, at the 96 dpi the browser lays millimetres out with. */
export const SHEET_WIDTH_PX = (210 * 96) / 25.4;

/**
 * Shrinks the preview until a whole sheet fits the column it sits in. The sheet is drawn at its
 * real A4 width, which is wider than the column on most screens, and a teacher checking a worksheet
 * wants to see the right-hand column, not scroll to it.
 *
 * Returns a callback ref, because the element it measures appears only once a worksheet has been
 * generated — a ref object would still be empty when the effect first ran.
 */
export function useFitScale(targetWidth: number): [(node: HTMLDivElement | null) => void, number] {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!node || typeof ResizeObserver === 'undefined') return;

    // The observer reports the box once on observe, so there is no separate first measurement.
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (width > 0) setScale(Math.min(1, width / targetWidth));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, targetWidth]);

  return [setNode, scale];
}
