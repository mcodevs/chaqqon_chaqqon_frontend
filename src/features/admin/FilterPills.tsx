import { useEffect, useRef } from 'react';
import { type SegmentOption, SegmentedControl } from '@/shared/ui/SegmentedControl';
import styles from './Admin.module.css';

/**
 * The pill row the admin filters with. A label never breaks in two ("O'tgan / oy"); when the row is
 * wider than the screen it scrolls sideways instead of squeezing its options, keeping the chosen one in view.
 */
export function FilterPills<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const box = useRef<HTMLDivElement>(null);

  // Only the row scrolls, never the page: the chosen pill is nudged in from whichever edge hides it.
  useEffect(() => {
    const row = box.current;
    const chosen = row?.querySelector('[aria-checked="true"]');
    if (!row || !chosen) return;
    const edge = row.getBoundingClientRect();
    const pill = chosen.getBoundingClientRect();
    if (pill.left < edge.left) row.scrollLeft -= edge.left - pill.left;
    else if (pill.right > edge.right) row.scrollLeft += pill.right - edge.right;
  }, [value]);

  return (
    <div ref={box} className={styles.filterPills}>
      <SegmentedControl label={label} appearance="pill" options={options} value={value} onChange={onChange} />
    </div>
  );
}
