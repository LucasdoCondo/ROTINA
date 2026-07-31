const pino = require('pino');

const isDev = process.env.NODE_ENV === 'development';

const logger = pino(
  {
    level: isDev ? 'debug' : 'info',
    base: {
      env: process.env.NODE_ENV,
      service: 'rotina-api',
    },
  },
  isDev ? pino.transport({ target: 'pino-pretty', options: { colorize: true } }) : undefined
);

module.exports = { logger };
