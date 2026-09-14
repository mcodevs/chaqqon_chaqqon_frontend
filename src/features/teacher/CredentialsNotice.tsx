import type { StudentCredentials } from '@/application/studentService';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import styles from './Teacher.module.css';

interface CredentialsNoticeProps {
  credentials: StudentCredentials;
  onDismiss: () => void;
}

/** Passwords are stored hashed, so this is the only moment the teacher can see one. */
export function CredentialsNotice({ credentials, onDismiss }: CredentialsNoticeProps) {
  return (
    <Card className={styles.credentials} role="status">
      <div className={styles.credentialsTitle}>O'quvchiga kirish ma'lumotlarini bering</div>
      <dl className={styles.credentialsList}>
        <dt>Login</dt>
        <dd>{credentials.username}</dd>
        <dt>Parol</dt>
        <dd>{credentials.password}</dd>
      </dl>
      <p className={styles.credentialsHint}>Parol faqat hozir ko'rinadi. Yo'qolsa, uni yangilash mumkin.</p>
      <Button tone="violet" size="sm" onClick={onDismiss}>
        Yozib oldim
      </Button>
    </Card>
  );
}
