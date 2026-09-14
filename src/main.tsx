import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { createAppServices } from '@/app/composition';
import '@/styles/global.css';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

const services = await createAppServices();

createRoot(container).render(
  <StrictMode>
    <App services={services} />
  </StrictMode>,
);
