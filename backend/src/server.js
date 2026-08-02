require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const prisma = require('./config/prisma');
const { logger } = require('./config/logger');

// Importar rotas
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const usuariosRoutes = require('./routes/usuarios');
const chamadosRoutes = require('./routes/chamados');
const clientesRoutes = require('./routes/clientes');
const produtosRoutes = require('./routes/produtos');
const pedidosRoutes = require('./routes/pedidos');
const membrosRoutes = require('./routes/membros');
const webhookRoutes = require('./routes/webhooks');
const assinaturaRoutes = require('./routes/assinatura');
const auditoriaRoutes = require('./routes/auditoria');
const lgpdRoutes = require('./routes/lgpd');
const testEmailRoutes = require('./routes/test-email');

const app = express();

// Sentry (opcional) — monitoramento de erros
// Só inicializa se SENTRY_DSN estiver configurado no .env
if (process.env.SENTRY_DSN) {
  try {
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    });
    logger.info('Sentry inicializado', { env: process.env.NODE_ENV });
  } catch (error) {
    logger.warn({ error: error.message }, 'Falha ao inicializar Sentry');
  }
}

// Logger HTTP (pino-http) — loga método, URL, status, duração
const pinoHttp = require('pino-http');
app.use(pinoHttp({
  logger,
  serializers: {
    err: pinoHttp.stdSerializers.err,
  },
}));

// Security middleware
app.use(helmet());

// CORS — aceita múltiplas origens (localhost + Vercel + previews)
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

function corsOptions() {
  const allowedOrigins = [
    corsOrigin,
    'https://rotina-sjlu.vercel.app',
    'https://rotina-sjlu-git-*.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
  ];

  return {
    origin: (origin, callback) => {
      // Permitir requisições sem origin (Postman, health checks)
      if (!origin) return callback(null, true);

      // Verificar se a origin está na lista ou corresponde ao padrão
      const isAllowed = allowedOrigins.some((allowed) => {
        if (allowed.includes('*')) {
          const regex = new RegExp('^' + allowed.replace(/\*/g, '.*') + '$');
          return regex.test(origin);
        }
        return origin === allowed;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        logger.warn({ origin }, 'CORS bloqueou requisição');
        callback(new Error('Origin não permitida pelo CORS'));
      }
    },
    credentials: true,
  };
}

app.use(cors(corsOptions()));

// Sentry request handler (middleware de captura de erros)
// Só ativa se SENTRY_DSN estiver configurado
if (process.env.SENTRY_DSN) {
  try {
    const Sentry = require('@sentry/node');
    app.use(Sentry.Handlers.requestHandler());
    
    // Tracing apenas em produção
    if (process.env.NODE_ENV === 'production') {
      app.use(Sentry.Handlers.tracingHandler());
    }
  } catch (error) {
    logger.warn({ error: error.message }, 'Falha ao inicializar middleware Sentry');
  }
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // limite de 100 requisições por IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ═══════════════════════════════════════════════
// Webhooks (devem vir ANTES do express.json())
// Os webhooks precisam do body em RAW (text) para
// validar a assinatura digital do gateway
// ═══════════════════════════════════════════════
app.use('/api/webhooks', webhookRoutes);

// Body parser (para todas as outras rotas)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/chamados', chamadosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/membros', membrosRoutes);
app.use('/api/assinatura', assinaturaRoutes);
app.use('/api/auditoria', auditoriaRoutes);
app.use('/api/tenant', lgpdRoutes);
app.use('/api/test-email', testEmailRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Verificar conexão com banco
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      status: 'ok',
      message: 'API SaaS funcionando',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: 'API funcionando mas banco de dados indisponível',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' });
});

// Sentry error handler (deve vir antes do error handler global)
if (process.env.SENTRY_DSN) {
  try {
    const Sentry = require('@sentry/node');
    app.use(Sentry.Handlers.errorHandler());
  } catch (error) {
    logger.warn({ error: error.message }, 'Falha ao inicializar Sentry error handler');
  }
}

// Tratamento de erros global
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  // Log estruturado do erro (para Sentry, Datadog, etc.)
  logger.error({
    err,
    statusCode,
    url: req.url,
    method: req.method,
  }, 'Erro não tratado');

  res.status(statusCode).json({
    message: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    // Conectar ao banco de dados via Prisma
    await prisma.$connect();
    console.log('✅ Conexão com PostgreSQL estabelecida via Prisma');

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
      console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API: http://localhost:${PORT}/api`);
      console.log(`💚 Health: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
};

startServer();