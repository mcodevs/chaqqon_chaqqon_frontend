import { BrowserRouter } from 'react-router-dom';
import type { AppServices } from '@/application/appServices';
import { ServicesContext } from '@/shared/services/ServicesContext';
import { SessionProvider } from './providers/SessionProvider';
import { AppRouter } from './router/AppRouter';

export function App({ services }: { services: AppServices }) {
  return (
    <ServicesContext.Provider value={services}>
      <SessionProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </SessionProvider>
    </ServicesContext.Provider>
  );
}
