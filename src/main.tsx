import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { createAppServices } from '@/app/composition';
import { initTelegramViewport } from '@/infrastructure/telegram/telegramWebApp';
import '@/styles/global.css';

// Inside Telegram, claim the full viewport and signal readiness. No-op in a browser.
initTelegramViewport(window);

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

const services = await createAppServices();

createRoot(container).render(
  <StrictMode>
    <App services={services} />
  </StrictMode>,
);
