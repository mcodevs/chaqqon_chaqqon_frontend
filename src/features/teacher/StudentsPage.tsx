import { useState } from 'react';
import type { StudentCredentials } from '@/application/studentService';
import { useStudentAccounts } from '@/shared/services/queries';
import { LoadingScreen } from '@/shared/ui/LoadingScreen';
import { AddStudentForm } from './AddStudentForm';
import { CredentialsNotice } from './CredentialsNotice';
import { StudentList } from './StudentList';

export function StudentsPage() {
  const students = useStudentAccounts();
  const [issuedCredentials, setIssuedCredentials] = useState<StudentCredentials | null>(null);

  if (!students) return <LoadingScreen />;

  return (
    <>
      {issuedCredentials && (
        <CredentialsNotice credentials={issuedCredentials} onDismiss={() => setIssuedCredentials(null)} />
      )}
      <AddStudentForm onCreated={setIssuedCredentials} />
      <StudentList students={students} onCredentialsIssued={setIssuedCredentials} />
    </>
  );
}
