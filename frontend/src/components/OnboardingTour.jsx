import { useEffect } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

export const OnboardingTour = ({ isFirstLogin }) => {
  useEffect(() => {
    if (!isFirstLogin) return;

    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'finish'],
      nextBtnText: 'Próximo',
      doneBtnText: 'Concluir',
      progressText: 'Passo {{current}} de {{total}}',
      steps: [
        {
          element: '#step-dashboard',
          popover: {
            title: 'Visão Geral',
            description: 'Aqui você acompanha seus indicadores em tempo real.',
            side: 'bottom',
          },
        },
        {
          element: '#step-new-item',
          popover: {
            title: 'Primeiro Registro',
            description: 'Clique aqui para cadastrar seu primeiro cliente ou chamado.',
            side: 'bottom',
          },
        },
        {
          element: '#step-settings',
          popover: {
            title: 'Convide sua equipe',
            description: 'Adicione os membros da sua empresa nas configurações.',
            side: 'bottom',
          },
        },
      ],
    });

    driverObj.drive();

    return () => driverObj.destroy();
  }, [isFirstLogin]);

  return null;
};