import { useState } from 'react';
import type { StudentCredentials } from '@/application/studentService';
import { type CalendarDate, type Payment, type StudentAccess, accessOf } from '@/domain/billing';
import { type StudentAccount, fullName } from '@/domain/users';
import { formatCalendarDate } from '@/shared/format';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useServices } from '@/shared/services/ServicesContext';
import { notifyPaymentRecorded } from '@/shared/telegram/telegramNotifications';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { NameAvatar } from '@/shared/ui/NameAvatar';
import { EmptyState, ErrorMessage } from '@/shared/ui/Notice';
import { PaymentForm } from './PaymentForm';
import styles from './Teacher.module.css';

interface StudentListProps {
  students: readonly StudentAccount[];
  payments: readonly Payment[];
  today: CalendarDate;
  onCredentialsIssued: (credentials: StudentCredentials) => void;
}

function accessLabel({ open, paidUntil }: StudentAccess): string {
  if (!paidUntil) return "Yopiq · to'lov belgilanmagan";
  return open
    ? `${formatCalendarDate(paidUntil)} gacha ochiq`
    : `Yopiq · ${formatCalendarDate(paidUntil)} kuni tugagan`;
}

export function StudentList({ students, payments, today, onCredentialsIssued }: StudentListProps) {
  const { students: studentService, billing } = useServices();
  const recordPayment = useAsyncAction(billing.recordPayment);
  const cancelPayment = useAsyncAction(billing.cancelLatestPayment);
  const resetPassword = useAsyncAction(studentService.resetPassword);
  const removeStudent = useAsyncAction(studentService.remove);
  /** Whose "To'ladi" form is open. */
  const [payingId, setPayingId] = useState<string | null>(null);

  const handlePayment = async (student: StudentAccount, paidUntil: CalendarDate) => {
    if (await recordPayment.run(student.id, paidUntil)) {
      setPayingId(null);
      notifyPaymentRecorded({
        studentId: student.id,
        paidUntil: formatCalendarDate(paidUntil),
      });
    }
  };

  const handleCancelPayment = (student: StudentAccount) => {
    if (window.confirm(`${student.firstName} uchun oxirgi to'lov bekor qilinsinmi?`)) {
      void cancelPayment.run(student.id);
    }
  };

  const handleReset = async (student: StudentAccount) => {
    if (!window.confirm(`${student.firstName} uchun yangi parol yaratilsinmi?`)) return;
    const credentials = await resetPassword.run(student.id);
    if (credentials) onCredentialsIssued(credentials);
  };

  const handleRemove = (student: StudentAccount) => {
    if (window.confirm(`${fullName(student)} o'chirilsinmi?`)) void removeStudent.run(student.id);
  };

  return (
    <Card title={`O'quvchilar ro'yxati (${students.length})`}>
      <ErrorMessage>
        {recordPayment.error ?? cancelPayment.error ?? resetPassword.error ?? removeStudent.error}
      </ErrorMessage>
      {students.length === 0 && <EmptyState>Hozircha o'quvchi qo'shilmagan.</EmptyState>}
      <ul className={styles.list}>
        {students.map((student) => {
          const access = accessOf(payments, student.id, today);
          const paying = payingId === student.id;
          return (
            <li key={student.id} className={styles.item}>
              <div className={styles.row}>
                <NameAvatar name={student.firstName} />
                <div className={styles.info}>
                  <div className={styles.name}>
                    {fullName(student)}
                    {student.age !== null && `, ${student.age} yosh`}
                  </div>
                  <div className={styles.meta}>
                    login: <b>{student.username}</b>
                  </div>
                  <div
                    className={`${styles.access} ${access.open ? styles.accessOpen : styles.accessClosed}`}
                  >
                    {accessLabel(access)}
                    {access.latest && (
                      <button
                        type="button"
                        className={styles.linkButton}
                        disabled={cancelPayment.pending}
                        onClick={() => handleCancelPayment(student)}
                      >
                        bekor qilish
                      </button>
                    )}
                  </div>
                </div>
                <div className={styles.rowActions}>
                  <Button
                    size="sm"
                    tone="green"
                    aria-expanded={paying}
                    onClick={() => setPayingId(paying ? null : student.id)}
                  >
                    To'ladi
                  </Button>
                  <Button size="sm" variant="soft" tone="blue" onClick={() => handleReset(student)}>
                    Yangi parol
                  </Button>
                  <Button size="sm" variant="soft" tone="coral" onClick={() => handleRemove(student)}>
                    O'chirish
                  </Button>
                </div>
              </div>
              {paying && (
                <PaymentForm
                  firstName={student.firstName}
                  access={access}
                  today={today}
                  pending={recordPayment.pending}
                  onSave={(paidUntil) => void handlePayment(student, paidUntil)}
                  onCancel={() => setPayingId(null)}
                />
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
