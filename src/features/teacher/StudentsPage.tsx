import { useState } from 'react';
import type { StudentCredentials } from '@/application/studentService';
import { canAddStudent } from '@/domain/teacherBilling';
import { formatCalendarDate } from '@/shared/format';
import {
  usePayments,
  useSchoolToday,
  useStudentAccounts,
  useTeacherAccount,
} from '@/shared/services/queries';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { SkeletonList } from '@/shared/ui/LoadingScreen';
import { AddStudentForm } from './AddStudentForm';
import { CredentialsNotice } from './CredentialsNotice';
import { StudentList } from './StudentList';
import styles from './Teacher.module.css';

export function StudentsPage() {
  const students = useStudentAccounts();
  const payments = usePayments();
  const today = useSchoolToday();
  const account = useTeacherAccount();
  const [issuedCredentials, setIssuedCredentials] = useState<StudentCredentials | null>(null);
  /* Adding is occasional; the list is the everyday job, so the form starts closed. */
  const [adding, setAdding] = useState(false);

  if (!students || !payments) {
    return (
      <Card title="O'quvchilar ro'yxati">
        <SkeletonList rows={5} />
      </Card>
    );
  }

  // Counted from the live roster: the account's own count is only as fresh as its last load.
  const limit = account?.tariff.maxStudents ?? null;
  const full = !canAddStudent(students.length, limit);

  return (
    <>
      {issuedCredentials && (
        <CredentialsNotice credentials={issuedCredentials} onDismiss={() => setIssuedCredentials(null)} />
      )}

      <div className={styles.pageToolbar}>
        <span className={styles.toolbarText}>
          {students.length}
          {limit ? ` / ${limit}` : ''} ta o'quvchi · bugun {formatCalendarDate(today)}
        </span>
        <Button
          aria-expanded={adding}
          variant={adding ? 'outline' : 'primary'}
          disabled={full && !adding}
          onClick={() => setAdding((value) => !value)}
        >
          {adding ? 'Yopish' : "+ O'quvchi qo'shish"}
        </Button>
      </div>
      {full && (
        <p className={styles.toolbarText} role="status">
          Tarifingizdagi o'quvchilar soni to'ldi. Ko'proq o'quvchi uchun tarifni o'zgartiring (Profil →
          Obuna).
        </p>
      )}

      {adding && (
        <AddStudentForm
          onCreated={(credentials) => {
            setIssuedCredentials(credentials);
            setAdding(false);
          }}
        />
      )}

      <StudentList
        students={students}
        payments={payments}
        today={today}
        onCredentialsIssued={setIssuedCredentials}
      />
    </>
  );
}
