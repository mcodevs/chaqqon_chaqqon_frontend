import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import type { Session } from '@/application/session';
import { useServices } from '@/shared/services/ServicesContext';
import { SessionContext } from '@/shared/session/SessionContext';
import { LoadingScreen } from '@/shared/ui/LoadingScreen';

type SessionState = { status: 'restoring' } | { status: 'ready'; session: Session | null };

export function SessionProvider({ children }: { children: ReactNode }) {
  const { auth, telegram } = useServices();
  const [state, setState] = useState<SessionState>({ status: 'restoring' });

  useEffect(() => {
    let active = true;
    auth.restoreSession().then(
      (session) => active && setState({ status: 'ready', session }),
      (error: unknown) => {
        console.error(error);
        if (active) setState({ status: 'ready', session: null });
      },
    );
    const unsubscribe = auth.onSessionEnded(() => setState({ status: 'ready', session: null }));
    return () => {
      active = false;
      unsubscribe();
    };
  }, [auth]);

  const session = state.status === 'ready' ? state.session : null;

  // Inside Telegram, link this device's chat to the signed-in account so it can
  // receive push notifications. A no-op in a normal browser.
  useEffect(() => {
    if (!session || !telegram.isAvailable()) return;
    telegram.link().catch((error: unknown) => console.error(error));
  }, [session, telegram]);

  const signIn = useCallback((session: Session) => setState({ status: 'ready', session }), []);

  const signOut = useCallback(() => {
    setState({ status: 'ready', session: null });
    // Unlink this device (best effort, while the token is still valid) before signing out.
    Promise.resolve(telegram.isAvailable() ? telegram.unlink() : undefined)
      .catch((error: unknown) => console.error(error))
      .finally(() => {
        auth.logout().catch((error: unknown) => console.error(error));
      });
  }, [auth, telegram]);
  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut]);

  if (state.status === 'restoring') return <LoadingScreen />;
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
