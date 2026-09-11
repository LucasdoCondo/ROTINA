import { useEffect } from 'react';

export const SupportWidget = () => {
  useEffect(() => {
    // Configuração do Crisp — ID via variable de entorno (VITE_CRISP_WEBSITE_ID)
    const crispWebsiteId = import.meta.env.VITE_CRISP_WEBSITE_ID;

    // No cargar el widget si no está configura el ID
    if (!crispWebsiteId || crispWebsiteId === 'SEU_CRISP_WEBSITE_ID') return;

    window.$crisp = [];
    window.CRISP_WEBSITE_ID = crispWebsiteId;

    // Carregar script do Crisp
    const script = document.createElement('script');
    script.src = 'https://client.crisp.chat/l.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    // Cleanup
    return () => {
      if (script.parentNode) document.head.removeChild(script);
      delete window.$crisp;
      delete window.CRISP_WEBSITE_ID;
    };
  }, []);

  return null;
};