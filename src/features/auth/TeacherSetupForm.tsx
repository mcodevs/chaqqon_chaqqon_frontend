import { type FormEvent, useState } from 'react';
import type { Session } from '@/application/session';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useServices } from '@/shared/services/ServicesContext';
import { Button } from '@/shared/ui/Button';
import { ErrorMessage } from '@/shared/ui/Notice';
import { TextField } from '@/shared/ui/TextField';
import styles from './forms.module.css';

export function TeacherSetupForm({ onAuthenticated }: { onAuthenticated: (session: Session) => void }) {
  const { auth } = useServices();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const register = useAsyncAction(auth.registerTeacher);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const session = await register.run({ username, password, passwordConfirmation });
    if (session) onAuthenticated(session);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h2 className={styles.title}>O'qituvchi hisobini yarating</h2>
      <TextField
        label="Login"
        placeholder="masalan: mohira"
        autoComplete="username"
        autoCapitalize="none"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <TextField
        label="Parol"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <TextField
        label="Parolni tasdiqlang"
        type="password"
        autoComplete="new-password"
        value={passwordConfirmation}
        onChange={(e) => setPasswordConfirmation(e.target.value)}
      />
      <ErrorMessage>{register.error}</ErrorMessage>
      <Button type="submit" block tone="violet" disabled={register.pending}>
        Hisob yaratish
      </Button>
    </form>
  );
}
