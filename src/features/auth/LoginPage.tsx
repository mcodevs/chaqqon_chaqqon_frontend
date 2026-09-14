import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@/application/session';
import { useServices } from '@/shared/services/ServicesContext';
import { homePath, useSession } from '@/shared/session/SessionContext';
import { LoadingScreen } from '@/shared/ui/LoadingScreen';
import { AuthLayout } from './AuthLayout';
import { LoginForm } from './LoginForm';
import { TeacherSetupForm } from './TeacherSetupForm';

export function LoginPage() {
  const { auth } = useServices();
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [hasTeacher, setHasTeacher] = useState<boolean>();

  useEffect(() => {
    let active = true;
    auth.hasTeacher().then((exists) => active && setHasTeacher(exists));
    return () => {
      active = false;
    };
  }, [auth]);

  const handleAuthenticated = (session: Session) => {
    signIn(session);
    navigate(homePath(session), { replace: true });
  };

  if (hasTeacher === undefined) return <LoadingScreen />;

  return (
    <AuthLayout>
      {hasTeacher ? (
        <LoginForm onAuthenticated={handleAuthenticated} />
      ) : (
        <TeacherSetupForm onAuthenticated={handleAuthenticated} />
      )}
    </AuthLayout>
  );
}
