import { useEffect } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';
import type { AppServices } from '@/application/appServices';
import { ServicesContext } from '@/shared/services/ServicesContext';
import { bindTelegramBackButton } from '@/shared/telegram/telegramWebApp';
import { SessionProvider } from './providers/SessionProvider';
import { AppRouter } from './router/AppRouter';

function TelegramBackButtonSync() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const isRoot =
      location.pathname === '/' ||
      location.pathname === '/login' ||
      location.pathname === '/student' ||
      location.pathname === '/teacher';

    if (!isRoot) {
      return bindTelegramBackButton(() => {
        navigate(-1);
      });
    }
    return undefined;
  }, [location.pathname, navigate]);

  return null;
}

export function App({ services }: { services: AppServices }) {
  return (
    <ServicesContext.Provider value={services}>
      <SessionProvider>
        <BrowserRouter>
          <TelegramBackButtonSync />
          <AppRouter />
        </BrowserRouter>
      </SessionProvider>
    </ServicesContext.Provider>
  );
}
