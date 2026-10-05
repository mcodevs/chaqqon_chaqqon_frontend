import type { CalendarDate } from '@/domain/billing';
import type { Student } from '@/domain/users';
import { formatCalendarDate } from '@/shared/format';
import { Button } from '@/shared/ui/Button';
import styles from './ClosedAccountPage.module.css';

interface ClosedAccountPageProps {
  student: Student;
  /** The day access ended; null when the teacher has not recorded a payment yet. */
  paidUntil: CalendarDate | null;
  onLogout: () => void;
}

/**
 * Shown instead of the app while a student is unpaid. It stands on its own rather than
 * inside the dashboard shell: there is nothing to navigate to, so the screen carries its
 * own header and its own way out. It opens by itself once the teacher records a payment.
 */
export function ClosedAccountPage({ student, paidUntil, onLogout }: ClosedAccountPageProps) {
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

          <h1 className={styles.title}>Profilingiz yopiq</h1>
          <p className={styles.greeting}>{student.firstName}, hisobingiz vaqtincha to'xtatilgan.</p>

          <div className={styles.fact}>
            <span className={styles.factLabel}>
              {paidUntil ? "To'lov muddati tugagan" : "To'lov"}
            </span>
            <span className={styles.factValue}>
              {paidUntil ? formatCalendarDate(paidUntil) : 'hali belgilanmagan'}
            </span>
          </div>

          <p className={styles.help}>
            Davom etish uchun ustozingizga murojaat qiling. Ustoz to'lovni belgilashi bilan sahifa
            o'zi ochiladi.
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
