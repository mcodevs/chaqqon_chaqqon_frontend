import { schoolDate } from '@/domain/billing';
import type { TeacherAccountView } from '@/application/accountService';
import { FEATURE_META } from '@/domain/teacherBilling';
import { formatCalendarDate, formatSom } from '@/shared/format';
import { usePlatformSettings } from '@/shared/services/queries';
import { Card } from '@/shared/ui/Card';
import styles from './Subscription.module.css';
import { STATUS_LABEL, contactLine } from './subscriptionText';

const KIND_LABEL = { payment: "To'lov", bonus: 'Bonus', adjustment: 'Tuzatish', charge: 'Oylik' } as const;

/** The teacher's tariff, balance and the last movements of their ledger. */
export function SubscriptionCard({ account }: { account: TeacherAccountView }) {
  const settings = usePlatformSettings();
  const { billing, tariff } = account;
  const contact = contactLine(settings);
  const recent = account.ledger.toReversed().slice(0, 6);

  return (
    <Card title={`Obuna · ${STATUS_LABEL[billing.status]}`}>
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Tarif</span>
          <span className={styles.summaryValue}>{tariff.name}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Balans</span>
          <span className={styles.summaryValue}>{formatSom(billing.balance)}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Keyingi to'lov</span>
          <span className={styles.summaryValue}>
            {billing.nextChargeDate ? formatCalendarDate(billing.nextChargeDate) : '—'}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>O'quvchilar</span>
          <span className={styles.summaryValue}>
            {account.studentCount}
            {tariff.maxStudents ? ` / ${tariff.maxStudents}` : ''}
          </span>
        </div>
      </div>

      {billing.nextChargeDate && (
        <p className={styles.hint}>
          Har oy {formatSom(billing.nextChargeAmount)} balansdan yechiladi
          {billing.monthsCovered > 0 ? ` · balans yana ${billing.monthsCovered} oyga yetadi` : ''}.
        </p>
      )}

      <ul className={styles.featureList} aria-label="Tarifdagi bo'limlar">
        {tariff.features.map((feature) => (
          <li key={feature} className={styles.featureChip}>
            {FEATURE_META[feature].label}
          </li>
        ))}
      </ul>

      {recent.length > 0 && (
        <ul className={styles.ledger}>
          {recent.map((entry) => (
            <li key={entry.id} className={styles.ledgerRow}>
              <span>
                {KIND_LABEL[entry.kind]}
                <span className={styles.ledgerMeta}>
                  {formatCalendarDate(entry.periodStart ?? schoolDate(new Date(entry.createdAt)))}
                  {entry.note && entry.kind !== 'charge' ? ` · ${entry.note}` : ''}
                </span>
              </span>
              <span className={entry.amount > 0 ? styles.amountIn : styles.amountOut}>
                {entry.amount > 0 ? '+' : ''}
                {formatSom(entry.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {contact && <p className={styles.hint}>To'lov va tarifni o'zgartirish uchun: {contact}</p>}
    </Card>
  );
}
