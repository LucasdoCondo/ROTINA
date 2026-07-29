# Arquitetura de Tratamento de Erros Global

## Visão Geral

O projeto ROTINA utiliza uma estratégia de tratamento de erros em duas frentes:
- **Sentry**: Captura exceções com stack trace e contexto no frontend e backend
- **Pino**: Gera logs em formato JSON estruturado no servidor

---

## Frontend (Vite + React)

### 1. Logger Estruturado (`frontend/src/lib/logger.ts`)

Configuração centralizada do Pino para logging no frontend:

```typescript
/// <reference types="vite/client" />

import pino from 'pino';

const isDev = import.meta.env.DEV;
const env = isDev ? 'development' : 'production';

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  transport: isDev ? {
    target: 'pino-pretty',
    options: { colorize: true }
  } : undefined,
  base: { env }
});
```

**Características:**
- Formatação colorida em desenvolvimento
- Logs em JSON estruturado em produção
- Nível dinâmico baseado no ambiente

### 2. Configuração do Sentry (`frontend/src/utils/sentry.js`)

```javascript
import * as Sentry from '@sentry/react';

export function initSentry() {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: 1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

export { Sentry };
```

### 3. Error Boundary (`frontend/src/components/ErrorBoundary.jsx`)

Componente React que captura erros de renderização e reporta ao Sentry:

```jsx
export class ErrorBoundary extends Component {
  componentDidCatch(error, errorInfo) {
    // Log estruturado com Pino
    logger.error(
      {
        err: error,
        componentStack: errorInfo.componentStack,
      },
      'Erro capturado pelo ErrorBoundary'
    );

    // Reporta ao Sentry com contexto adicional
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        errorBoundary: 'react',
      },
    });
  }
}
```

**Uso:**
- Envolve todas as rotas da aplicação no `App.jsx`
- Captura erros em componentes filhos
- Exibe UI amigável em caso de erro
- Logs estruturados + report para Sentry

### 4. Inicialização no App (`frontend/src/App.jsx`)

```javascript
function App() {
  if (import.meta.env.VITE_SENTRY_DSN) {
    initSentry();
  }

  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}
```

---

## Backend (Express + Node.js)

### 1. Logger Estruturado (`backend/src/config/logger.js`)

```javascript
const pino = require('pino');

const isDev = process.env.NODE_ENV === 'development';

export const logger = pino(
  {
    level: isDev ? 'debug' : 'info',
    base: {
      env: process.env.NODE_ENV,
      service: 'rotina-api'
    }
  },
  isDev ? pino.transport({ target: 'pino-pretty', options: { colorize: true } }) : undefined
);
```

**Características:**
- Formatação colorida em desenvolvimento
- Logs em JSON estruturado em produção
- Campo `service` para filtrar logs
- Compatível com Vercel Logs, Datadog, CloudWatch

### 2. HTTP Logging (`backend/src/server.js`)

```javascript
const pinoHttp = require('pino-http');
app.use(pinoHttp({
  logger,
  serializers: {
    err: pinoHttp.stdSerializers.err
  }
}));
```

**Loga automaticamente:**
- Método HTTP (GET, POST, etc.)
- URL da requisição
- Status code da resposta
- Tempo de processamento

### 3. Middleware de Tratamento de Erros (`backend/src/server.js`)

```javascript
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  logger.error({
    err,
    statusCode,
    url: req.url,
    method: req.method
  }, 'Erro não tratado');

  res.status(statusCode).json({
    message: err.message || 'Erro interno do servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});
```

**Captura:**
- Erros não tratados em rotas
- Log estruturado com stack trace
- Response limpa sem vazar dados sensíveis
- Stack trace apenas em desenvolvimento

### 4. Wrapper de Rotas API (`backend/src/middleware/apiHandler.js`)

```javascript
function withErrorHandling(routeHandler) {
  return async (req, res, next) => {
    try {
      return await routeHandler(req, res, next);
    } catch (error) {
      const { method, url } = req;

      logger.error({
        err: error,
        url,
        method
      }, `[API Error] Falha na requisição ${method} ${url}`);

      // Reporta ao Sentry (opcional)
      if (process.env.SENTRY_DSN) {
        const Sentry = require('@sentry/node');
        Sentry.withScope((scope) => {
          scope.setTag('api_url', url);
          scope.setTag('api_method', method);
          Sentry.captureException(error);
        });
      }

      const statusCode = error.statusCode || 500;

      res.status(statusCode).json({
        error: 'Erro interno no servidor',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
  };
}
```

**Uso em rotas:**
```javascript
const { withErrorHandling } = require('../middleware/apiHandler');

router.post('/login', withErrorHandling(authController.login));
router.get('/perfil', authenticateToken, withErrorHandling(authController.perfil));
```

### 5. Configuração do Sentry (`backend/src/server.js`)

```javascript
if (process.env.SENTRY_DSN) {
  try {
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0
    });
    logger.info('Sentry inicializado', { env: process.env.NODE_ENV });
  } catch (error) {
    logger.warn({ error: error.message }, 'Falha ao inicializar Sentry');
  }
}
```

---

## Variáveis de Ambiente

### Frontend (`frontend/.env` ou `.env.local`)
```bash
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### Backend (`backend/.env`)
```bash
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
NODE_ENV=development
```

---

## Dependências Instaladas

### Frontend
```bash
npm install pino @sentry/react pino-pretty
```

### Backend
```bash
npm install pino pino-pretty @sentry/node
```

---

## Fluxo de Tratamento de Erros

### Frontend
1. Erro ocorre em componente React
2. `ErrorBoundary` captura a exceção
3. Log estruturado enviado ao Pino (terminal)
4. Exceção reportada ao Sentry (com contexto do componente)
5. UI exibe mensagem amigável
6. Usuário pode tentar novamente

### Backend
1. Erro ocorre em controller/rota
2. `withErrorHandling` captura a exceção
3. Log estruturado enviado ao Pino (JSON)
4. Exceção reportada ao Sentry (com URL e método)
5. HTTP 500 retornado com mensagem genérica
6. Stack trace visível apenas em desenvolvimento

---

## Monitoramento

### Logs Estruturados (Pino)
```json
{
  "level": 50,
  "msg": "Erro capturado pelo ErrorBoundary",
  "err": {
    "type": "Error",
    "message": "Something went wrong",
    "stack": "..."
  },
  "componentStack": "...",
  "time": "2024-01-15T10:30:00.000Z",
  "env": "production",
  "service": "rotina-api"
}
```

### Sentry - Contexto Enviado
- **Frontend:** Component stack, user agent, URL da página
- **Backend:** URL da API, método HTTP, usuário autenticado (se disponível)

---

## Benefícios

1. **Observabilidade Total**: Logs estruturados + rastreamento de erros
2. **Performance**: Pino é um dos loggers mais rápidos do mercado
3. **Contexto Rico**: Stack traces + contexto de request + dados de usuário
4. **Alertas Inteligentes**: Sentry com triagem automática de erros
5. **Debugging Facilitado**: Correlação entre logs e exceções
6. **Compliance**: LGPD-friendly (não vaza dados sensíveis)

---

## Próximos Passos

1. Configurar DSNs no Sentry (produção)
2. Configurar alertas no Sentry (email, Slack)
3. Integrar com ferramenta de logs (Datadog, CloudWatch)
4. Adicionar user context nas requisições autenticadas
5. Implementar métricas de performance (APM)