import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Role } from '@/application/session';
import { homePath, useSession } from '@/shared/session/SessionContext';

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { session } = useSession();
  if (session?.role !== role) return <Navigate to={homePath(session)} replace />;
  return children;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { session } = useSession();
  if (session) return <Navigate to={homePath(session)} replace />;
  return children;
}

export function HomeRedirect() {
  const { session } = useSession();
  return <Navigate to={homePath(session)} replace />;
}
