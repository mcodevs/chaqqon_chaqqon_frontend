import type { CSSProperties } from 'react';
import styles from './Art.module.css';

/**
 * Chaqqon-chaqqon's mark: one soroban bead on its rod, in a soft brand disc. Replaces the ⚡ emoji
 * in the header, the footer and the share preview. Decorative: the wordmark next to it is the name.
 */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span
      className={className ? `${styles.brandMark} ${className}` : styles.brandMark}
      style={{ '--mark-size': `${size}px` } as CSSProperties}
      aria-hidden="true"
    >
      <span className={styles.brandBead} />
    </span>
  );
}

/** The abacus bar laid flat as a section divider, above the footer. Takes the width it is given. */
export function RodDivider({ className }: { className?: string }) {
  return (
    <span
      className={className ? `${styles.rodDivider} ${className}` : styles.rodDivider}
      aria-hidden="true"
    />
  );
}

/**
 * The 8px bead that marks a short label. The landing's `.eyebrow` already draws one of its own, so
 * eyebrows need nothing extra; the bare class is `beadDot` in Art.module.css.
 */
export function BeadDot({ className }: { className?: string }) {
  return (
    <span className={className ? `${styles.beadDot} ${className}` : styles.beadDot} aria-hidden="true" />
  );
}
