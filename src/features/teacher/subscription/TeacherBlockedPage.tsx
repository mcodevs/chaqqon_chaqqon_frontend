import type { TeacherAccountView } from '@/application/accountService';
import { formatCalendarDate, formatSom } from '@/shared/format';
import { usePlatformSettings } from '@/shared/services/queries';
import { Button } from '@/shared/ui/Button';
import styles from './Subscription.module.css';
import { contactLine } from './subscriptionText';

/**
 * Shown instead of the teacher's panel while management is closed. Like the student's closed page it
 * stands on its own, with its own way out, and opens by itself once the admin records the payment.
 */
export function TeacherBlockedPage({
  account,
  onLogout,
}: {
  account: TeacherAccountView;
  onLogout: () => void;
}) {
  const settings = usePlatformSettings();
  const contact = contactLine(settings);
  const disabled = account.billing.status === 'disabled';

  return (
    <div className={styles.shell}>
      <header className={styles.topBar}>
        <span className={styles.brandLogo} aria-hidden="true">
          ⚡
        </span>
        <span className={styles.brandText}>Chaqqon-chaqqon</span>
      </header>

      <main className={styles.main}>
        <section className={styles.card} role="status">
          <div className={styles.lock} aria-hidden="true">
            🔒
          </div>
          <h1 className={styles.title}>
            {disabled ? "Akkaunt to'xtatilgan" : 'Boshqaruv vaqtincha yopildi'}
          </h1>
          <p className={styles.greeting}>
            {disabled
              ? "Platforma administratori akkauntingizni to'xtatgan."
              : "Oylik to'lov kechikkani uchun o'quvchilarni boshqarish yopildi."}
          </p>

          {!disabled && (
            <dl className={styles.facts}>
              <div className={styles.fact}>
                <dt>Balans</dt>
                <dd className={styles.negative}>{formatSom(account.billing.balance)}</dd>
              </div>
              {account.billing.overdueSince && (
                <div className={styles.fact}>
                  <dt>Qarz qaysi oydan</dt>
                  <dd>{formatCalendarDate(account.billing.overdueSince)}</dd>
                </div>
              )}
            </dl>
          )}

          <p className={styles.help}>
            O'quvchilaringiz mashq qilishda davom etadi.{' '}
            {disabled ? 'Administrator' : "To'lov qilinishi bilan"} sahifa o'zi ochiladi.
            {contact && (
              <>
                <br />
                <strong>To'lov uchun: {contact}</strong>
              </>
            )}
          </p>

          <div className={styles.actions}>
            <Button variant="primary" block onClick={() => window.location.reload()}>
              Qayta tekshirish
            </Button>
            <Button variant="ghost" tone="neutral" block onClick={onLogout}>
              Chiqish
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
