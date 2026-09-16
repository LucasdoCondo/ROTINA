import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { Toaster } from 'react-hot-toast';
import { initSentry } from './utils/sentry';
import { injectSpeedInsights } from '@vercel/speed-insights';

// Inicializar Sentry (opcional — só se VITE_SENTRY_DSN estiver configurado)
initSentry();

// Inicializar Vercel Speed Insights
injectSpeedInsights();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Toaster position="top-right" />
  </React.StrictMode>
);
