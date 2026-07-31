const pino = require('pino');

const isDev = process.env.NODE_ENV === 'development';

const logger = pino({
  level: isDev ? 'debug' : 'info',
  base: {
    env: process.env.NODE_ENV,
    service: 'rotina-api',
  },
});

module.exports = { logger };
