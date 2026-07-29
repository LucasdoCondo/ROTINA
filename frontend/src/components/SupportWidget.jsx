import { useEffect } from 'react';

export const SupportWidget = () => {
  useEffect(() => {
    // Configuração do Crisp - substitua pelo seu próprio ID
    window.$crisp = [];
    window.CRISP_WEBSITE_ID = 'SEU_CRISP_WEBSITE_ID';

    // Carregar script do Crisp
    const script = document.createElement('script');
    script.src = 'https://client.crisp.chat/l.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    // Cleanup
    return () => {
      document.head.removeChild(script);
      delete window.$crisp;
      delete window.CRISP_WEBSITE_ID;
    };
  }, []);

  return null;
};