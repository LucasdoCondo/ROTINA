# Guia de Uso - Tratamento de Erros

## Como usar o sistema de logging e tratamento de erros

---

## Frontend

### 1. Usando o Logger

```javascript
import { logger } from '../lib/logger';

// Logs simples
logger.info('Usuário carregou o dashboard');
logger.warn('Token expirando em 5 minutos');
logger.error('Falha ao carregar dados', { endpoint: '/api/dashboard' });

// Logs com contexto estruturado
logger.info(
  {
    userId: user.id,
    email: user.email,
    tenantId: user.tenantId
  },
  'Login realizado com sucesso'
);
```

### 2. Capturando Erros Manualmente

```javascript
import { Sentry } from '../utils/sentry';

try {
  await fetchData();
} catch (error) {
  // Log local
  logger.error({ err: error, context: 'data-fetch' }, 'Falha ao buscar dados');

  // Reporta ao Sentry com tags
  Sentry.withScope((scope) => {
    scope.setTag('feature', 'dashboard');
    scope.setUser({ id: user.id, email: user.email });
    Sentry.captureException(error);
  });

  // Mostra toast amigável para o usuário
  toast.error('Não foi possível carregar os dados. Tente novamente.');
}
```

### 3. Adicionando Contexto do Usuário

```javascript
import { Sentry } from '../utils/sentry';

// Quando o usuário faz login
function setUserContext(user) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
  });
}

// Quando o usuário desloga
function clearUserContext() {
  Sentry.setUser(null);
}
```

---

## Backend

### 1. Usando o Logger

```javascript
import { logger } from '../config/logger';

// Logs simples
logger.info('Nova requisição de criação de pedido');
logger.warn('Tentativa de acesso a recurso protegido');
logger.error('Falha ao processar pagamento', { orderId: 123 });

// Logs com contexto estruturado
logger.info(
  {
    userId: req.user.id,
    ip: req.ip,
    endpoint: req.url,
    method: req.method
  },
  'Requisição recebida'
);
```

### 2. Wrapper em Rotas (Recomendado)

```javascript
const { withErrorHandling } = require('../middleware/apiHandler');

// Adicione o wrapper nas rotas
router.post('/criar-pedido', withErrorHandling(pedidoController.criar));
router.put('/atualizar/:id', withErrorHandling(pedidoController.atualizar));
router.delete('/remover/:id', withErrorHandling(pedidoController.remover));
```

### 3. Lançando Erros com Código HTTP

```javascript
// Nos controllers
async function criar(req, res, next) {
  try {
    const { nome, email } = req.body;

    // Validação
    if (!nome || !email) {
      const error = new Error('Nome e email são obrigatórios');
      error.statusCode = 400;
      throw error;
    }

    // Lógica de negócio
    const cliente = await criarCliente(nome, email);

    logger.info({ clienteId: cliente.id }, 'Cliente criado com sucesso');

    res.status(201).json({
      success: true,
      data: cliente
    });
  } catch (error) {
    next(error);
  }
}
```

### 4. Adicionando Contexto do Usuário

```javascript
// Nos controllers ou middleware
import * as Sentry from '@sentry/node';

router.use(authMiddleware, (req, res, next) => {
  if (req.user) {
    Sentry.setUser({
      id: req.user.id,
      email: req.user.email,
      role: req.user.role,
      tenantId: req.user.tenantId,
    });
  }
  next();
});
```

---

## Boas Práticas

### FRONTEND

1. **Use o ErrorBoundary para erros de componentes**
   ```javascript
   <ErrorBoundary>
     <MeuComponente />
   </ErrorBoundary>
   ```

2. **Loge eventos importantes do usuário**
   ```javascript
   logger.info({ action: 'button_click', button: 'save-dashboard' }, 'User interaction');
   ```

3. **Reporte erros assíncronos ao Sentry**
   ```javascript
   try {
     await apiCall();
   } catch (error) {
     Sentry.captureException(error);
     // tratamento local
   }
   ```

4. **Use tags para categorizar erros**
   ```javascript
   Sentry.withScope((scope) => {
     scope.setTag('module', 'dashboard');
     scope.setTag('feature', 'charts');
     Sentry.captureException(error);
   });
   ```

### BACKEND

1. **Use `withErrorHandling` em todas as rotas**
   ```javascript
   router.post('/rota', withErrorHandling(controller.acao));
   ```

2. **Loge entrada e saída de requests**
   ```javascript
   logger.info({ endpoint, method }, 'Processando requisição');
   // ... lógica
   logger.info({ endpoint, method }, 'Requisição processada com sucesso');
   ```

3. **Defina statusCode nos erros customizados**
   ```javascript
   const error = new Error('Recurso não encontrado');
   error.statusCode = 404;
   throw error;
   ```

4. **Adicione contexto rico nos logs**
   ```javascript
   logger.error(
     {
       err: error,
       userId: req.user?.id,
       tenantId: req.user?.tenantId,
       ip: req.ip,
       userAgent: req.headers['user-agent']
     },
     'Erro ao processar requisição'
   );
   ```

---

## Debugging

### Encontrando um erro no Sentry

1. Acesse o dashboard do Sentry
2. Busque pelo título do erro ou ID
3. Veja o stack trace completo
4. Verifique os tags (api_url, api_method, feature)
5. Consulte os logs do Pino correlacionados

### Filtrando Logs no Pino

```bash
# Logs de erro apenas
npm run logs | grep '"level":50'

# Logs de uma feature específica (busque no campo msg)
npm run logs | grep 'Dashboard'

# Logs em produção
npm run logs --env production
```

### Monitorando em Tempo Real

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev

# Logs aparecem formatados no terminal com cores
```

---

## Troubleshooting

### Erro: "Cannot find module 'pino'"
- Execute `npm install pino pino-pretty` na pasta do projeto

### Sentry não está capturando erros
- Verifique se `VITE_SENTRY_DSN` (frontend) ou `SENTRY_DSN` (backend) está configurado
- Verifique se o DSN está correto no Sentry
- Em produção, verifique se o build incluiu o SDK do Sentry

### Logs não aparecem no terminal
- Verifique se está em modo desenvolvimento
- Verifique se o `pino-pretty` está instalado
- Em produção, os logs vão para stdout (JSON)

### Erros não aparecem no Pino
- Verifique se o logger está importado corretamente
- Verifique se `withErrorHandling` está aplicado na rota
- Verifique se o erro está sendo repassado com `next(error)`

---

## Variáveis de Ambiente Necessárias

### Frontend (.env ou .env.local)
```bash
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx  # Opcional
```

### Backend (.env)
```bash
NODE_ENV=development
SENTRY_DSN=https://xxx@sentry.io/xxx      # Opcional
PORT=3001
```

---

## Fluxo Completo de um Erro

1. **Usuário clica em botão que causa erro**
2. **Frontend:** ErrorBoundary ou catch captura o erro
3. **Frontend:** Logger registra erro em JSON
4. **Frontend:** Sentry recebe o erro com contexto do componente
5. **Frontend:** UI exibe mensagem amigável
6. **Backend:** (se aplicável) withErrorHandling captura erro na API
7. **Backend:** Logger registra erro em JSON com URL e método
8. **Backend:** Sentry recebe com tags da rota
9. **Backend:** Retorna 500 com mensagem genérica
10. **Time:** Recebe alerta no Sentry e investiga com logs do Pino

---

## Checklist para Novas Features

- [ ] Rotas API envolvidas com `withErrorHandling`
- [ ] Erros lançados com `error.statusCode` apropriado
- [ ] Logs informativos adicionados nos controllers
- [ ] Tratamento de erros assíncronos no frontend
- [ ] Contexto do usuário enviado ao Sentry (se autenticado)
- [ ] Tags apropriadas no Sentry para categorização
- [ ] Testado em modo desenvolvimento (logs visíveis)
- [ ] Verificado que não vaza dados sensíveis em produção