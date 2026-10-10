import type { TeacherAccountView } from '@/application/accountService';
import { formatCalendarDate, formatSom } from '@/shared/format';
import { usePlatformSettings } from '@/shared/services/queries';
import styles from './Subscription.module.css';
import { contactLine } from './subscriptionText';

/** Above every teacher page while a fee is coming that the balance will not cover, or is overdue. */
export function SubscriptionBanner({ account }: { account: TeacherAccountView }) {
  const settings = usePlatformSettings();
  const { billing } = account;
  const contact = contactLine(settings);

  if (billing.status === 'overdue') {
    return (
      <div className={`${styles.banner} ${styles.bannerDanger}`} role="alert">
        <strong>Balans: {formatSom(billing.balance)}.</strong>{' '}
        {billing.blockedFrom && (
          <>
            {formatCalendarDate(billing.blockedFrom)} gacha to'lang ({billing.daysUntilBlock} kun qoldi) — aks
            holda boshqaruv vaqtincha yopiladi.
          </>
        )}
        {contact && <span className={styles.bannerContact}>To'lov uchun: {contact}</span>}
      </div>
    );
  }

  if (billing.status === 'due_soon' && billing.nextChargeDate) {
    return (
      <div className={`${styles.banner} ${styles.bannerWarning}`} role="status">
        <strong>
          {formatCalendarDate(billing.nextChargeDate)} kuni {formatSom(billing.nextChargeAmount)} yechiladi.
        </strong>{' '}
        Balansingiz: {formatSom(billing.balance)}.
        {contact && <span className={styles.bannerContact}>To'lov uchun: {contact}</span>}
      </div>
    );
  }

  return null;
}
