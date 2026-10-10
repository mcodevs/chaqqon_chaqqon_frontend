import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Session } from '@/application/session';
import { useServices } from '@/shared/services/ServicesContext';
import { homePath, useSession } from '@/shared/session/SessionContext';
import { LoadingScreen } from '@/shared/ui/LoadingScreen';
import { AuthLayout } from './AuthLayout';
import styles from './forms.module.css';
import { LoginForm } from './LoginForm';
import { AdminSetupForm } from './AdminSetupForm';

export function LoginPage() {
  const { auth, telegram } = useServices();
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [needsSetup, setNeedsSetup] = useState<boolean>();

  useEffect(() => {
    let active = true;
    auth.needsSetup().then((value) => active && setNeedsSetup(value));
    return () => {
      active = false;
    };
  }, [auth]);

  const handleAuthenticated = (session: Session) => {
    signIn(session);
    navigate(homePath(session), { replace: true });
  };

  if (needsSetup === undefined) return <LoadingScreen />;

  return (
    <AuthLayout>
      {needsSetup ? (
        <AdminSetupForm onAuthenticated={handleAuthenticated} />
      ) : (
        <LoginForm onAuthenticated={handleAuthenticated} />
      )}
      {/* Teachers find the platform from here; inside Telegram everyone already has an account. */}
      {!needsSetup && !telegram.isAvailable() && (
        <p className={styles.footnote}>
          Ustozmisiz? <Link to="/">Platforma haqida va ariza</Link>
        </p>
      )}
    </AuthLayout>
  );
}
