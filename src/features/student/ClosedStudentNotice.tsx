import type { CalendarDate } from '@/domain/billing';
import { formatCalendarDate } from '@/shared/format';
import { Button } from '@/shared/ui/Button';
import styles from './StudentLayout.module.css';

/**
 * Above every page while the student's subscription has ended: what still works, and the way out
 * (on a phone the profile page, where sign-out lives, is closed too).
 */
export function ClosedStudentBanner({
  paidUntil,
  onLogout,
}: {
  paidUntil: CalendarDate | null;
  onLogout: () => void;
}) {
  return (
    <div className={styles.closedBanner} role="status">
      <span className={styles.closedIcon} aria-hidden="true">
        🔒
      </span>
      <div className={styles.closedText}>
        <strong>
          {paidUntil
            ? `Obunangiz ${formatCalendarDate(paidUntil)} kuni tugagan.`
            : 'Obunangiz hali ochilmagan.'}
        </strong>{' '}
        Hozircha mashq va abakus ochiq, lekin natijalar saqlanmaydi. Davom etish uchun ustozingizga murojaat
        qiling.
      </div>
      <Button size="sm" variant="ghost" tone="neutral" onClick={onLogout}>
        Chiqish
      </Button>
    </div>
  );
}

/** In place of a page that needs an open subscription. */
export function ClosedSection() {
  return (
    <div className={styles.closedSection}>
      <span aria-hidden="true">🔒</span>
      <h2>Bu bo'lim obuna tugagani uchun yopiq</h2>
      <p>Ustozingiz to'lovni belgilashi bilan hammasi o'zi ochiladi.</p>
    </div>
  );
}
