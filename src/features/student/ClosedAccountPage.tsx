import type { CalendarDate } from '@/domain/billing';
import type { Student } from '@/domain/users';
import { formatCalendarDate } from '@/shared/format';
import { Card } from '@/shared/ui/Card';
import { DashboardLayout } from '@/shared/ui/DashboardLayout';
import styles from './ClosedAccountPage.module.css';

interface ClosedAccountPageProps {
  student: Student;
  /** The day access ended; null when the teacher has not recorded a payment yet. */
  paidUntil: CalendarDate | null;
  onLogout: () => void;
}

/** Shown instead of the app while a student is unpaid. It opens by itself once the teacher records a payment. */
export function ClosedAccountPage({ student, paidUntil, onLogout }: ClosedAccountPageProps) {
  return (
    <DashboardLayout
      title={`Salom, ${student.firstName}!`}
      subtitle="Chaqqon-chaqqon"
      tabs={[]}
      onLogout={onLogout}
    >
      <Card className={styles.card} role="status">
        <div className={styles.icon} aria-hidden="true">
          🔒
        </div>
        <h2 className={styles.title}>Profilingiz yopiq</h2>
        <p className={styles.text}>
          {paidUntil
            ? `To'lov muddati ${formatCalendarDate(paidUntil)} kuni tugagan.`
            : 'Profilingiz hali ochilmagan.'}
        </p>
        <p className={styles.text}>
          Davom etish uchun ustozingizga murojaat qiling. Ustoz to'lovni belgilashi bilan sahifa o'zi
          ochiladi.
        </p>
      </Card>
    </DashboardLayout>
  );
}
