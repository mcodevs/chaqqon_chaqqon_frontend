import { useState } from 'react';
import type { StudentCredentials } from '@/application/studentService';
import { formatCalendarDate } from '@/shared/format';
import { usePayments, useSchoolToday, useStudentAccounts } from '@/shared/services/queries';
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

  return (
    <>
      {issuedCredentials && (
        <CredentialsNotice credentials={issuedCredentials} onDismiss={() => setIssuedCredentials(null)} />
      )}

      <div className={styles.pageToolbar}>
        <span className={styles.toolbarText}>
          {students.length} ta o'quvchi · bugun {formatCalendarDate(today)}
        </span>
        <Button
          aria-expanded={adding}
          variant={adding ? 'outline' : 'primary'}
          onClick={() => setAdding((value) => !value)}
        >
          {adding ? 'Yopish' : "+ O'quvchi qo'shish"}
        </Button>
      </div>

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
