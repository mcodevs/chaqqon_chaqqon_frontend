import type { StudentCredentials } from '@/application/studentService';
import { type StudentAccount, fullName } from '@/domain/users';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useServices } from '@/shared/services/ServicesContext';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { NameAvatar } from '@/shared/ui/NameAvatar';
import { EmptyState, ErrorMessage } from '@/shared/ui/Notice';
import styles from './Teacher.module.css';

interface StudentListProps {
  students: readonly StudentAccount[];
  onCredentialsIssued: (credentials: StudentCredentials) => void;
}

export function StudentList({ students, onCredentialsIssued }: StudentListProps) {
  const { students: studentService } = useServices();
  const resetPassword = useAsyncAction(studentService.resetPassword);
  const removeStudent = useAsyncAction(studentService.remove);

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
      <ErrorMessage>{resetPassword.error ?? removeStudent.error}</ErrorMessage>
      {students.length === 0 && <EmptyState>Hozircha o'quvchi qo'shilmagan.</EmptyState>}
      <ul className={styles.list}>
        {students.map((student) => (
          <li key={student.id} className={styles.row}>
            <NameAvatar name={student.firstName} />
            <div className={styles.info}>
              <div className={styles.name}>
                {fullName(student)}
                {student.age !== null && `, ${student.age} yosh`}
              </div>
              <div className={styles.meta}>
                login: <b>{student.username}</b>
              </div>
            </div>
            <div className={styles.rowActions}>
              <Button size="sm" variant="soft" tone="blue" onClick={() => handleReset(student)}>
                Yangi parol
              </Button>
              <Button size="sm" variant="soft" tone="coral" onClick={() => handleRemove(student)}>
                O'chirish
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
