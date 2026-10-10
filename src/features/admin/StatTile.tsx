import type { ReactNode } from 'react';
import styles from './Admin.module.css';

interface StatTileProps {
  label: string;
  value: string;
  /** A line under the value: a comparison or what the number counts. */
  detail?: ReactNode;
  tone?: 'positive' | 'negative';
}

export function StatTile({ label, value, detail, tone }: StatTileProps) {
  return (
    <div className={styles.tile}>
      <span className={styles.tileLabel}>{label}</span>
      <span className={`${styles.tileValue} ${tone ? styles[`tile_${tone}`] : ''}`}>{value}</span>
      {detail && <span className={styles.tileDetail}>{detail}</span>}
    </div>
  );
}
