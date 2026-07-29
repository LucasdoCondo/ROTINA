const { logger } = require('../config/logger');

// Wrapper para tratamento de erros em rotas de API
// Loga com Pino e, se Sentry estiver ativo, reporta a exceção.
function withErrorHandling(routeHandler) {
  return async (req, res, next) => {
    try {
      return await routeHandler(req, res, next);
    } catch (error) {
      const { method, url } = req;

      logger.error(
        {
          err: error,
          url,
          method,
        },
        `[API Error] Falha na requisição ${method} ${url}`
      );

      // Reporta ao Sentry (opcional)
      if (process.env.SENTRY_DSN) {
        try {
          const Sentry = require('@sentry/node');
          Sentry.withScope((scope) => {
            scope.setTag('api_url', url);
            scope.setTag('api_method', method);
            Sentry.captureException(error);
          });
        } catch (sentryError) {
          logger.warn({ error: sentryError.message }, 'Falha ao enviar erro para Sentry');
        }
      }

      const statusCode = error.statusCode || 500;

      res.status(statusCode).json({
        error: 'Erro interno no servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      });
    }
  };
}

module.exports = { withErrorHandling };