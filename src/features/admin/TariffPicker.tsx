import type { Tariff } from '@/domain/teacherBilling';
import { formatSom } from '@/shared/format';
import styles from './Admin.module.css';

/** Tariffs are few, so they are chips: every choice visible, one tap away. */
export function TariffPicker({
  tariffs,
  value,
  onChange,
}: {
  tariffs: readonly Tariff[];
  value: string;
  onChange: (tariffId: string) => void;
}) {
  return (
    <div>
      <span className={styles.fieldLabel}>Tarif</span>
      <div className={styles.chips} role="radiogroup" aria-label="Tarif">
        {tariffs
          .filter((tariff) => !tariff.archivedAt || tariff.id === value)
          .map((tariff) => (
            <button
              key={tariff.id}
              type="button"
              role="radio"
              aria-checked={tariff.id === value}
              aria-pressed={tariff.id === value}
              className={styles.chipButton}
              onClick={() => onChange(tariff.id)}
            >
              {tariff.name} · {formatSom(tariff.monthlyPrice)}
            </button>
          ))}
      </div>
    </div>
  );
}
