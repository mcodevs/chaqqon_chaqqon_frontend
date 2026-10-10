import type { ReactNode } from 'react';
import { FEATURES, FEATURE_META, type Tariff } from '@/domain/teacherBilling';
import { formatSom } from '@/shared/format';
import styles from './Tariffs.module.css';

const STATUS = {
  archived: { icon: '📦', label: 'Arxivda' },
  public: { icon: '🌐', label: "Landing'da" },
  hidden: { icon: '🔒', label: 'Yashirin' },
} as const;

/**
 * One tariff as the admin compares it with the others: price, limit, who uses it, and every section
 * listed in the same order, open or not, so two cards side by side read row by row.
 */
export function TariffCard({
  tariff,
  teacherCount,
  actions,
}: {
  tariff: Tariff;
  /** Teachers on this tariff; left out while the list is still loading. */
  teacherCount?: number;
  actions?: ReactNode;
}) {
  const status = STATUS[tariff.archivedAt ? 'archived' : tariff.isPublic ? 'public' : 'hidden'];
  const open = FEATURES.filter((feature) => tariff.features.includes(feature)).length;

  return (
    <article className={styles.card} data-archived={tariff.archivedAt !== null}>
      <header className={styles.cardHead}>
        <h3 className={styles.cardName}>{tariff.name}</h3>
        <span className={styles.status}>
          <span aria-hidden="true">{status.icon}</span> {status.label}
        </span>
      </header>

      <p className={styles.price}>
        {tariff.monthlyPrice > 0 ? formatSom(tariff.monthlyPrice) : 'Bepul'}
        {tariff.monthlyPrice > 0 && <span className={styles.perMonth}> / oy</span>}
      </p>

      <ul className={styles.facts}>
        <li>
          <span aria-hidden="true">👥</span>{' '}
          {tariff.maxStudents ? `${tariff.maxStudents} tagacha o'quvchi` : "O'quvchilar soni cheklanmagan"}
        </li>
        {teacherCount !== undefined && (
          <li>
            <span aria-hidden="true">🧑‍🏫</span>{' '}
            {teacherCount > 0 ? `${teacherCount} ustoz shu tarifda` : "Hali ustoz yo'q"}
          </li>
        )}
      </ul>

      {tariff.description && <p className={styles.description}>{tariff.description}</p>}

      <div className={styles.cardSections}>
        <p className={styles.cardSectionsHead}>
          <span>Bo'limlar</span>
          <span>
            {open} / {FEATURES.length}
          </span>
        </p>
        <ul className={styles.checklist}>
          {FEATURES.map((feature) => {
            const included = tariff.features.includes(feature);
            return (
              <li key={feature} data-included={included}>
                <span className={styles.checkMark} aria-hidden="true">
                  {included ? '✓' : '–'}
                </span>
                {FEATURE_META[feature].label}
                {!included && <span className={styles.srOnly}> — kirmaydi</span>}
              </li>
            );
          })}
        </ul>
      </div>

      {actions && <div className={styles.cardActions}>{actions}</div>}
    </article>
  );
}
