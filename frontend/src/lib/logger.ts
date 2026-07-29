/// <reference types="vite/client" />

import pino from 'pino';

const isDev = import.meta.env.DEV;
const env = isDev ? 'development' : 'production';

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  // Em desenvolvimento, usa o pino-pretty para formatar no terminal
  transport:
    isDev
      ? {
          target: 'pino-pretty',
          options: { colorize: true },
        }
      : undefined,
  base: {
    env,
  },
});
