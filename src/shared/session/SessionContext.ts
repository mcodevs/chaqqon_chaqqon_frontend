import { createContext, useContext } from 'react';
import type { Session } from '@/application/session';

export interface SessionContextValue {
  session: Session | null;
  signIn: (session: Session) => void;
  signOut: () => void;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}

export function homePath(session: Session | null): string {
  if (!session) return '/login';
  return session.role === 'teacher' ? '/teacher' : '/student';
}
