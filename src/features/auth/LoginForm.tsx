import { type FormEvent, useMemo, useState } from 'react';
import type { Role, Session } from '@/application/session';
import { useAsyncAction } from '@/shared/hooks/useAsyncAction';
import { useServices } from '@/shared/services/ServicesContext';
import { getTelegramUser, isTelegramWebApp, triggerHaptic } from '@/shared/telegram/telegramWebApp';
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

  const telegramUser = useMemo(() => (isTelegramWebApp() ? getTelegramUser() : null), []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const session = await login.run({ role, username, password });
    if (session) {
      triggerHaptic('success');
      onAuthenticated(session);
    } else {
      triggerHaptic('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {telegramUser && (
        <div className={styles.telegramNotice}>
          <span className={styles.telegramIcon}>📱</span>
          <div>
            <strong>Telegram: {telegramUser.username ? `@${telegramUser.username}` : telegramUser.first_name}</strong>
            <br />
            Bir marta login va parolni kiriting — hisobingiz ushbu Telegramga biriktiriladi va keyingi safar avtomatik
            ochiladi!
          </div>
        </div>
      )}
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
      <Button type="submit" block tone={role === 'teacher' ? 'violet' : 'coral'} disabled={login.pending}>
        Kirish
      </Button>
    </form>
  );
}
