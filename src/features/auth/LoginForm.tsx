import { type FormEvent, useState } from 'react';
import type { Role, Session } from '@/application/session';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useServices } from '@/shared/services/ServicesContext';
import { Button } from '@/shared/ui/Button';
import { ErrorMessage } from '@/shared/ui/Notice';
import { SegmentedControl } from '@/shared/ui/SegmentedControl';
import { TextField } from '@/shared/ui/TextField';
import styles from './forms.module.css';

const ROLE_OPTIONS = [
  { value: 'student', label: "O'quvchi" },
  { value: 'teacher', label: 'Ustoz' },
] as const;

export function LoginForm({ onAuthenticated }: { onAuthenticated: (session: Session) => void }) {
  const { auth } = useServices();
  const [role, setRole] = useState<Role>('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const login = useAsyncAction(auth.login);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const session = await login.run({ role, username, password });
    if (session) onAuthenticated(session);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className={styles.roleToggle}>
        <SegmentedControl
          label="Rol"
          appearance="pill"
          options={ROLE_OPTIONS}
          value={role}
          onChange={setRole}
        />
      </div>
      <TextField
        label="Login"
        autoComplete="username"
        autoCapitalize="none"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <TextField
        label="Parol"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <ErrorMessage>{login.error}</ErrorMessage>
      <Button type="submit" size="lg" block disabled={login.pending}>
        Kirish
      </Button>
    </form>
  );
}
