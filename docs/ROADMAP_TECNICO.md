# Roadmap Técnico — Pré-definições para Implementação Futura

> Documento de planejamento contendo as bases técnicas para 5 áreas críticas do SaaS ROTINA.
> Cada seção inclui: requisitos, implementação base, configuração e próximos passos.

---

## Sumário

1. [Observabilidade & Tratamento de Erros](#1-observabilidade--tratamento-de-erros)
2. [Infraestrutura de E-mails Transacionais](#2-infraestrutura-de-e-mails-transacionais)
3. [Conformidade Legal & LGPD](#3-conformidade-legal--lgpd)
4. [Auditoria e Logs de Atividades (Audit Logs)](#4-auditoria-e-logs-de-atividades-audit-logs)
5. [Onboarding Automático & Suporte](#5-onboarding-automático--suporte)

---

## 1. Observabilidade & Tratamento de Erros

### 1.1 Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│                    OBSERVABILIDADE                          │
├─────────────────────────────────────────────────────────────┤
│  🔴 Sentry (Error Tracking)                                │
│     → Backend: captura exceções do Node.js                 │
│     → Frontend: captura erros de React + requisições       │
│                                                             │
│  📝 Pino (Logs Estruturados)                               │
│     → Substitui console.log por logs JSON                  │
│     → Níveis: debug, info, warn, error, fatal              │
│     → Request ID para rastrear requisições                 │
│                                                             │
│  📊 Better Stack (Uptime Monitoring)                       │
│     → Health check a cada 5 minutos                        │
│     → Alerta se API ficar offline                          │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Implementação Base — Logs Estruturados (Pino)

```bash
# Instalação
npm install pino pino-http pino-pretty
```

```javascript
// backend/src/config/logger.js
const pino = require('pino');
const pinoHttp = require('pino-http');

// Logger principal
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: { 'user-agent': req.headers['user-agent'] },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'body.password', 'body.senha'],
    censor: '[REDACTED]',
  },
});

// Middleware HTTP para Express
const httpLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.url === '/api/health',
  },
});

// Logger para requisições com requestId
function createRequestLogger(requestId) {
  return logger.child({ requestId });
}

module.exports = { logger, httpLogger, createRequestLogger };
```

```javascript
// backend/src/server.js (modificação)
const { httpLogger } = require('./config/logger');

// Adicionar ANTES das rotas
app.use(httpLogger);

// Uso nos controllers
const { logger } = require('../config/logger');

// Substituir console.error por logger.error
logger.error({ err, tenantId: req.tenantId }, 'Erro ao processar dashboard');
```

### 1.3 Implementação Base — Sentry (Error Tracking)

```bash
# Instalação
npm install @sentry/node @sentry/react @sentry/vite-plugin
```

```javascript
// backend/src/config/sentry.js
const Sentry = require('@sentry/node');

function initSentry(app) {
  if (!process.env.SENTRY_DSN) {
    console.warn('[Sentry] DSN não configurado. Pulando inicialização.');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
    ],
    beforeSend(event) {
      // Não enviar erros em desenvolvimento
      if (process.env.NODE_ENV === 'development') return null;
      return event;
    },
  });

  // Middleware do Sentry (deve ser o primeiro)
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());

  // Middleware de erro do Sentry (deve ser o último)
  app.use(Sentry.Handlers.errorHandler());
}

module.exports = { initSentry };
```

```jsx
// frontend/src/lib/sentry.js
import * as Sentry from '@sentry/react';
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from 'react-router-dom';

export function initSentryFrontend() {
  if (!import.meta.env.VITE_SENTRY_DSN) return;

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_NODE_ENV || 'development',
    integrations: [
      new Sentry.BrowserTracing({
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          useEffect,
          useLocation,
          useNavigationType,
          createRoutesFromChildren,
          matchRoutes
        ),
      }),
      new Sentry.Replay(),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

// Hook para capturar erros em componentes
export function useCaptureError() {
  return (error, context = {}) => {
    Sentry.captureException(error, { extra: context });
  };
}
```

### 1.4 Configuração no .env

```env
# Sentry (Error Tracking)
SENTRY_DSN="https://xxxx@sentry.io/xxxx"
VITE_SENTRY_DSN="https://xxxx@sentry.io/xxxx"

# Logging
LOG_LEVEL="info" # debug | info | warn | error
```

### 1.5 Próximos Passos

- [ ] Criar conta no Sentry (gratuito: 5k eventos/mês)
- [ ] Configurar DSN no .env
- [ ] Testar captura de erro proposital: `throw new Error('Test Sentry')`
- [ ] Configurar alertas no Sentry para erros críticos
- [ ] Adicionar logging estruturado em todos os controllers
- [ ] Configurar Better Stack para monitorar uptime

---

## 2. Infraestrutura de E-mails Transacionais

### 2.1 Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│              INFRAESTRUTURA DE E-MAILS                      │
├─────────────────────────────────────────────────────────────┤
│  📧 Resend (Serviço de E-mail)                             │
│     → Free Tier: 100 emails/dia                            │
│     → Domínio próprio: noreply@rotina.com.br               │
│     → SPF, DKIM, DMARC configurados no DNS                 │
│                                                             │
│  📝 Templates:                                             │
│     → Boas-vindas / Verificação de E-mail                  │
│     → Redefinição de Senha                                 │
│     → Convite de Membros                                   │
│     → Alerta de Falha de Pagamento                         │
│     → Fatura Mensal                                        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Configuração DNS (SPF, DKIM, DMARC)

```
# Registros DNS para o domínio rotina.com.br

# SPF - Autoriza o Resend a enviar e-mails pelo seu domínio
TIPO: TXT
NOME: @
VALOR: v=spf1 include:spf.resend.com ~all

# DKIM - Assinatura digital para validar a autenticidade
TIPO: CNAME
NOME: resend._domainkey
VALOR: dkim.resend.com

# DMARC - Política de como lidar com e-mails falsificados
TIPO: TXT
NOME: _dmarc
VALOR: v=DMARC1; p=quarantine; rua=mailto:dmarc@rotina.com.br
```

### 2.3 Implementação Base — Serviço de E-mail

```javascript
// backend/src/services/emailService.js
const { Resend } = require('resend');
const { logger } = require('../config/logger');

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const EMAIL_FROM = process.env.EMAIL_FROM || 'ROTINA <noreply@rotina.com.br>';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const emailService = {
  /**
   * Envia e-mail de boas-vindas com verificação
   */
  async sendWelcome(user, verificationToken) {
    if (!resend) {
      logger.warn('[Email] Resend não configurado. E-mail não enviado.');
      return;
    }

    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: user.email,
        subject: 'Bem-vindo ao ROTINA! Verifique seu e-mail',
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 40px; text-align: center;">
              <h1 style="color: white; margin: 0;">ROTINA</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2>Olá ${user.name}!</h2>
              <p>Bem-vindo ao ROTINA! Sua conta foi criada com sucesso.</p>
              <p>Para começar a usar, verifique seu e-mail clicando no botão abaixo:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_URL}/verificar-email?token=${verificationToken}"
                   style="background: #667eea; color: white; padding: 12px 30px; 
                          text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Verificar E-mail
                </a>
              </div>
              <p style="color: #666; font-size: 12px;">
                Se você não criou uma conta no ROTINA, ignore este e-mail.
              </p>
            </div>
          </body>
          </html>
        `,
      });
      logger.info({ email: user.email }, '[Email] Boas-vindas enviado');
    } catch (error) {
      logger.error({ err: error, email: user.email }, '[Email] Erro ao enviar boas-vindas');
    }
  },

  /**
   * Envia e-mail de redefinição de senha
   */
  async sendPasswordReset(user, resetToken) {
    if (!resend) return;

    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: user.email,
        subject: 'Redefinição de Senha - ROTINA',
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 40px; text-align: center;">
              <h1 style="color: white; margin: 0;">ROTINA</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2>Redefinição de Senha</h2>
              <p>Recebemos uma solicitação para redefinir sua senha.</p>
              <p>Clique no botão abaixo para criar uma nova senha:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_URL}/resetar-senha?token=${resetToken}"
                   style="background: #667eea; color: white; padding: 12px 30px;
                          text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Redefinir Senha
                </a>
              </div>
              <p style="color: #666; font-size: 12px;">
                Este link expira em 1 hora. Se você não solicitou esta redefinição, ignore este e-mail.
              </p>
            </div>
          </body>
          </html>
        `,
      });
      logger.info({ email: user.email }, '[Email] Reset de senha enviado');
    } catch (error) {
      logger.error({ err: error, email: user.email }, '[Email] Erro ao enviar reset de senha');
    }
  },

  /**
   * Envia convite para membro da equipe
   */
  async sendMemberInvite(invitedBy, inviteeEmail, inviteToken) {
    if (!resend) return;

    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: inviteeEmail,
        subject: `${invitedBy.name} convidou você para o ROTINA`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 40px; text-align: center;">
              <h1 style="color: white; margin: 0;">ROTINA</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2>Você foi convidado!</h2>
              <p><strong>${invitedBy.name}</strong> (${invitedBy.email}) convidou você para fazer parte da equipe no ROTINA.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_URL}/aceitar-convite?token=${inviteToken}"
                   style="background: #667eea; color: white; padding: 12px 30px;
                          text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Aceitar Convite
                </a>
              </div>
            </div>
          </body>
          </html>
        `,
      });
      logger.info({ email: inviteeEmail }, '[Email] Convite enviado');
    } catch (error) {
      logger.error({ err: error, email: inviteeEmail }, '[Email] Erro ao enviar convite');
    }
  },

  /**
   * Alerta de falha no pagamento
   */
  async sendPaymentFailed(tenant, subscription) {
    if (!resend) return;

    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: tenant.email,
        subject: '⚠️ Pagamento não aprovado - ROTINA',
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #e53e3e; padding: 40px; text-align: center;">
              <h1 style="color: white; margin: 0;">ROTINA</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2 style="color: #e53e3e;">⚠️ Pagamento não aprovado</h2>
              <p>Olá ${tenant.name},</p>
              <p>Não foi possível processar o pagamento da sua assinatura.</p>
              <p><strong>Plano:</strong> ${subscription.planId}</p>
              <p><strong>Valor:</strong> R$ ${subscription.value}</p>
              <p><strong>Tentativas:</strong> ${subscription.paymentAttempts}</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${APP_URL}/billing/upgrade?reason=past_due"
                   style="background: #e53e3e; color: white; padding: 12px 30px;
                          text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Regularizar Pagamento
                </a>
              </div>
              <p style="color: #666; font-size: 12px;">
                Seu acesso será bloqueado em 5 dias caso o pagamento não seja regularizado.
              </p>
            </div>
          </body>
          </html>
        `,
      });
      logger.info({ email: tenant.email }, '[Email] Alerta de falha enviado');
    } catch (error) {
      logger.error({ err: error, email: tenant.email }, '[Email] Erro ao enviar alerta de falha');
    }
  },

  /**
   * Envia fatura mensal
   */
  async sendInvoice(tenant, invoice) {
    if (!resend) return;

    try {
      await resend.emails.send({
        from: EMAIL_FROM,
        to: tenant.email,
        subject: `Fatura #${invoice.id} - ROTINA`,
        html: `
          <!DOCTYPE html>
          <html>
          <head><meta charset="utf-8"></head>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 40px; text-align: center;">
              <h1 style="color: white; margin: 0;">ROTINA</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <h2>Fatura Mensal</h2>
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Fatura:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">#${invoice.id}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Plano:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${invoice.planName}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Valor:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">R$ ${invoice.value}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>Vencimento:</strong></td>
                  <td style="padding: 10px; border-bottom: 1px solid #ddd;">${invoice.dueDate}</td>
                </tr>
              </table>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${invoice.invoiceUrl}"
                   style="background: #667eea; color: white; padding: 12px 30px;
                          text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Ver Fatura
                </a>
              </div>
            </div>
          </body>
          </html>
        `,
      });
      logger.info({ email: tenant.email }, '[Email] Fatura enviada');
    } catch (error) {
      logger.error({ err: error, email: tenant.email }, '[Email] Erro ao enviar fatura');
    }
  },
};

module.exports = emailService;
```

### 2.4 Próximos Passos

- [ ] Configurar domínio próprio no Resend
- [ ] Adicionar registros SPF, DKIM, DMARC no DNS
- [ ] Verificar domínio no Resend (status: verified)
- [ ] Testar envio de e-mail de boas-vindas
- [ ] Testar envio de redefinição de senha
- [ ] Integrar `emailService.sendWelcome()` no registro
- [ ] Integrar `emailService.sendPasswordReset()` no auth
- [ ] Integrar `emailService.sendPaymentFailed()` no webhook
- [ ] Criar templates responsivos (React Email opcional)

---

## 3. Conformidade Legal & LGPD

### 3.1 Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│                 CONFORMIDADE LEGAL & LGPD                   │
├─────────────────────────────────────────────────────────────┤
│  📋 Termos de Uso                                          │
│     → Regras de uso da plataforma                          │
│     → Nível de serviço (SLA)                               │
│     → Cancelamento e reembolso                             │
│     → Limitação de responsabilidade                        │
│                                                             │
│  🔒 Política de Privacidade (LGPD)                         │
│     → Dados coletados e finalidade                         │
│     → Base legal (consentimento, contrato)                 │
│     → Compartilhamento com terceiros                       │
│     → Direitos do titular (art. 18 LGPD)                   │
│     → Encarregado (DPO)                                    │
│                                                             │
│  📤 Exportação/Exclusão de Dados                           │
│     → API para exportar dados em CSV/JSON                  │
│     → API para excluir conta e dados                       │
│     → Período de retenção: 90 dias após exclusão           │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Implementação Base — Exportação de Dados

```javascript
// backend/src/services/dataExportService.js
const prisma = require('../config/prisma');
const { logger } = require('../config/logger');

const dataExportService = {
  /**
   * Exporta todos os dados de um tenant em formato JSON
   * Usado para: solicitação do cliente, migração, LGPD
   */
  async exportAllData(tenantId) {
    logger.info({ tenantId }, '[DataExport] Iniciando exportação');

    const [
      tenant,
      users,
      tickets,
      clients,
      products,
      orders,
      subscriptions,
      memberSubscriptions,
      modules,
    ] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: tenantId } }),
      prisma.user.findMany({
        where: { tenantId },
        select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
      }),
      prisma.ticket.findMany({ where: { tenantId } }),
      prisma.client.findMany({ where: { tenantId } }),
      prisma.product.findMany({ where: { tenantId } }),
      prisma.order.findMany({
        where: { tenantId },
        include: { items: true, client: { select: { name: true } } },
      }),
      prisma.subscription.findUnique({ where: { tenantId } }),
      prisma.memberSubscription.findMany({ where: { tenantId } }),
      prisma.tenantModule.findMany({ where: { tenantId } }),
    ]);

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      tenant: {
        name: tenant?.name,
        slug: tenant?.slug,
        email: tenant?.email,
        plan: tenant?.plan,
        createdAt: tenant?.createdAt,
      },
      users,
      tickets,
      clients,
      products,
      orders: orders.map(order => ({
        ...order,
        clientName: order.client?.name,
        client: undefined,
      })),
      subscription: subscriptions,
      memberSubscriptions,
      modules,
    };

    logger.info({ tenantId, size: JSON.stringify(exportData).length }, '[DataExport] Exportação concluída');

    return exportData;
  },

  /**
   * Exporta dados em formato CSV (para planilhas)
   */
  async exportAsCSV(tenantId, entity) {
    const data = await this.exportAllData(tenantId);
    const records = data[entity];

    if (!records || !Array.isArray(records) || records.length === 0) {
      return { csv: '', message: 'Nenhum registro encontrado' };
    }

    const headers = Object.keys(records[0]);
    const csvRows = [
      headers.join(','),
      ...records.map(row =>
        headers.map(h => {
          const value = row[h];
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          // Escapar vírgulas e aspas
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      ),
    ];

    return { csv: csvRows.join('\n'), total: records.length };
  },

  /**
   * Exclui todos os dados de um tenant (LGPD - direito ao esquecimento)
   * Mantém registro anônimo por 90 dias para auditoria
   */
  async deleteAllData(tenantId) {
    logger.info({ tenantId }, '[DataExport] Iniciando exclusão de dados');

    // 1. Salvar registro anônimo para auditoria
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, email: true, slug: true, createdAt: true },
    });

    await prisma.$executeRaw`
      INSERT INTO "DataDeletionLog" ("tenantId", "originalName", "originalEmail", "originalSlug", "deletedAt")
      VALUES (${tenantId}, ${tenant?.name}, ${tenant?.email}, ${tenant?.slug}, NOW())
    `;

    // 2. Excluir dados em ordem (respeitando foreign keys)
    await prisma.$transaction([
      prisma.onlineSession.deleteMany({ where: { tenantId } }),
      prisma.orderItem.deleteMany({ where: { order: { tenantId } } }),
      prisma.order.deleteMany({ where: { tenantId } }),
      prisma.product.deleteMany({ where: { tenantId } }),
      prisma.client.deleteMany({ where: { tenantId } }),
      prisma.ticket.deleteMany({ where: { tenantId } }),
      prisma.memberSubscription.deleteMany({ where: { tenantId } }),
      prisma.tenantModule.deleteMany({ where: { tenantId } }),
      prisma.subscription.deleteMany({ where: { tenantId } }),
      prisma.user.deleteMany({ where: { tenantId } }),
      prisma.tenant.delete({ where: { id: tenantId } }),
    ]);

    logger.info({ tenantId }, '[DataExport] Dados excluídos com sucesso');

    return { success: true, message: 'Todos os dados foram excluídos permanentemente.' };
  },
};

module.exports = dataExportService;
```

### 3.3 Schema para Log de Exclusão

```prisma
// Adicionar ao schema.prisma
model DataDeletionLog {
  id            String   @id @default(uuid())
  tenantId      String
  originalName  String?
  originalEmail String?
  originalSlug  String?
  deletedAt     DateTime @default(now())
  expiresAt     DateTime @default(now() + interval '90 days')

  @@index([tenantId])
  @@index([deletedAt])
}
```

### 3.4 Endpoints de Privacidade

```javascript
// backend/src/routes/privacy.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const dataExportService = require('../services/dataExportService');

// Exportar dados do tenant (JSON)
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const data = await dataExportService.exportAllData(req.tenantId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao exportar dados' });
  }
});

// Exportar dados em CSV
router.get('/export/:entity', authenticateToken, async (req, res) => {
  try {
    const { csv, total } = await dataExportService.exportAsCSV(req.tenantId, req.params.entity);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${req.params.entity}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao exportar dados' });
  }
});

// Solicitar exclusão da conta (LGPD)
router.post('/delete-account', authenticateToken, async (req, res) => {
  try {
    await dataExportService.deleteAllData(req.tenantId);
    res.json({ message: 'Conta e dados excluídos com sucesso.' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir conta' });
  }
});

module.exports = router;
```

### 3.5 Próximos Passos

- [ ] Elaborar minuta dos Termos de Uso (consultar advogado)
- [ ] Elaborar Política de Privacidade (LGPD)
- [ ] Criar página `/termos` e `/privacidade` no frontend
- [ ] Adicionar checkbox "Li e aceito os Termos" no registro
- [ ] Implementar endpoint de exportação de dados
- [ ] Implementar endpoint de exclusão de conta
- [ ] Configurar período de retenção de 90 dias para logs
- [ ] Nomear DPO (Encarregado de Dados)

---

## 4. Auditoria e Logs de Atividades (Audit Logs)

### 4.1 Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│                    AUDIT LOGS                               │
├─────────────────────────────────────────────────────────────┤
│  📝 O que registrar:                                       │
│     → Criação, edição e exclusão de recursos               │
│     → Alterações de permissão e cargo                      │
│     → Login e logout                                       │
│     → Configurações do sistema                             │
│     → Pagamentos e assinaturas                             │
│                                                             │
│  🔍 Para quê:                                              │
│     → Rastrear "quem fez o quê e quando"                   │
│     → Resolver disputas ("minha equipe sumiu com um dado") │
│     → Compliance e auditoria                               │
│     → Segurança da informação                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Schema do Audit Log

```prisma
// Adicionar ao schema.prisma
model AuditLog {
  id          String   @id @default(uuid())
  tenantId    String
  userId      String?
  userName    String?
  userRole    String?
  
  // Ação executada
  action      String   // 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export'
  entity      String   // 'user' | 'ticket' | 'client' | 'product' | 'order' | 'subscription' | 'settings'
  entityId    String?  // ID do recurso afetado
  
  // Detalhes
  description String   // Descrição legível: "Usuário Admin deletou o cliente João"
  metadata    Json?    // Dados adicionais (opcional)
  ipAddress   String?
  userAgent   String?
  
  createdAt   DateTime @default(now())

  @@index([tenantId, createdAt])
  @@index([tenantId, action])
  @@index([tenantId, entity])
  @@index([userId])
  @@index([createdAt])
}
```

### 4.3 Implementação Base — Serviço de Audit

```javascript
// backend/src/services/auditService.js
const prisma = require('../config/prisma');
const { logger } = require('../config/logger');

const auditService = {
  /**
   * Registra uma ação no audit log
   * 
   * @param {Object} params
   * @param {string} params.tenantId - ID do tenant
   * @param {string} params.userId - ID do usuário que executou
   * @param {string} params.userName - Nome do usuário
   * @param {string} params.userRole - Cargo do usuário
   * @param {string} params.action - Ação: create | update | delete | login | export
   * @param {string} params.entity - Entidade: user | ticket | client | product | order | subscription | settings
   * @param {string} params.entityId - ID do recurso (opcional)
   * @param {string} params.description - Descrição legível
   * @param {Object} params.metadata - Dados adicionais (opcional)
   * @param {string} params.ipAddress - IP da requisição (opcional)
   * @param {string} params.userAgent - User-Agent (opcional)
   */
  async log({ tenantId, userId, userName, userRole, action, entity, entityId, description, metadata, ipAddress, userAgent }) {
    try {
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId,
          userName,
          userRole,
          action,
          entity,
          entityId,
          description,
          metadata: metadata || undefined,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      // Audit log nunca deve quebrar a requisição principal
      logger.error({ err: error }, '[Audit] Erro ao registrar log');
    }
  },

  /**
   * Helper para criar descrições padronizadas
   */
  describe(action, entity, details) {
    const actions = {
      create: 'criou',
      update: 'alterou',
      delete: 'excluiu',
      login: 'fez login',
      logout: 'fez logout',
      export: 'exportou',
      view: 'visualizou',
      assign: 'atribuiu',
      comment: 'comentou em',
      cancel: 'cancelou',
      payment: 'realizou pagamento de',
    };

    const entities = {
      user: 'usuário',
      ticket: 'chamado',
      client: 'cliente',
      product: 'produto',
      order: 'pedido',
      subscription: 'assinatura',
      settings: 'configurações',
      member: 'membro',
      module: 'módulo',
    };

    const actionWord = actions[action] || action;
    const entityWord = entities[entity] || entity;

    return `${actionWord} ${entityWord}${details ? ` ${details}` : ''}`;
  },

  /**
   * Busca logs de auditoria de um tenant
   */
  async list(tenantId, { page = 1, limit = 50, action, entity, userId, startDate, endDate } = {}) {
    const where = { tenantId };

    if (action) where.action = action;
    if (entity) where.entity = entity;
    if (userId) where.userId = userId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },
};

module.exports = auditService;
```

### 4.4 Middleware de Audit Automático

```javascript
// backend/src/middleware/audit.js
const auditService = require('../services/auditService');

/**
 * Middleware que registra automaticamente ações CRUD no audit log
 * 
 * Uso:
 * router.delete('/:id', authenticateToken, audit('delete', 'client'), controller)
 */
function audit(action, entity) {
  return (req, res, next) => {
    // Salvar referência para usar após a resposta
    const originalJson = res.json.bind(res);
    const entityId = req.params.id;
    const description = auditService.describe(action, entity, entityId ? `#${entityId}` : '');

    res.json = function (body) {
      // Registrar no audit log após sucesso
      if (res.statusCode < 400) {
        auditService.log({
          tenantId: req.tenantId,
          userId: req.user?.id,
          userName: req.user?.nome,
          userRole: req.user?.cargo,
          action,
          entity,
          entityId,
          description,
          metadata: { requestBody: req.body, responseStatus: res.statusCode },
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });
      }

      return originalJson(body);
    };

    next();
  };
}

module.exports = { audit };
```

### 4.5 Uso nos Controllers

```javascript
// backend/src/controllers/clientesController.js (exemplo)
const { audit } = require('../middleware/audit');

// Nas rotas:
router.delete('/:id', 
  authenticateToken, 
  authorize('client:delete'),
  audit('delete', 'client'),  // ← Registra automaticamente
  clientesController.deletarCliente
);

// Ou manualmente nos services:
const auditService = require('../services/auditService');

await auditService.log({
  tenantId,
  userId: req.user.id,
  userName: req.user.nome,
  userRole: req.user.cargo,
  action: 'login',
  entity: 'user',
  description: `${req.user.nome} fez login no sistema`,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});
```

### 4.6 Próximos Passos

- [ ] Adicionar model `AuditLog` ao schema Prisma
- [ ] Rodar migration: `npx prisma migrate dev --name add_audit_logs`
- [ ] Implementar `auditService.log()` nos controllers principais
- [ ] Adicionar middleware `audit()` nas rotas de delete
- [ ] Criar página de auditoria no frontend (admin)
- [ ] Adicionar filtros: data, ação, entidade, usuário
- [ ] Configurar retenção de logs (ex: 90 dias)

---

## 5. Onboarding Automático & Suporte

### 5.1 Visão Geral

```
┌─────────────────────────────────────────────────────────────┐
│              ONBOARDING & SUPORTE                           │
├─────────────────────────────────────────────────────────────┤
│  🚀 Tour Guiado (Onboarding)                              │
│     → Tela pós-cadastro com 3 passos rápidos              │
│     → Time to Value < 5 minutos                           │
│     → Progresso salvo no localStorage                     │
│                                                             │
│  💬 Widget de Suporte (Crisp/HelpScout)                   │
│     → Chat ao vivo no canto inferior direito              │
│     → Base de conhecimento                                │
│     → Tickets automáticos                                 │
│                                                             │
│  📧 E-mails Automáticos de Onboarding                     │
│     → Dia 0: Boas-vindas                                  │
│     → Dia 1: "Primeiro chamado"                           │
│     → Dia 3: "Convide sua equipe"                         │
│     → Dia 7: "Dica avançada"                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Implementação Base — Componente de Tour

```jsx
// frontend/src/components/OnboardingTour.jsx
import { useState, useEffect } from 'react';
import './OnboardingTour.css';

const STEPS = [
  {
    id: 'welcome',
    title: '👋 Bem-vindo ao ROTINA!',
    description: 'Vamos te ajudar a começar em apenas 3 passos.',
    icon: '🚀',
    target: '.dashboard-header',
    position: 'bottom',
  },
  {
    id: 'create-ticket',
    title: '📋 Crie seu primeiro chamado',
    description: 'Registre um chamado de suporte para testar o sistema.',
    icon: '🎫',
    target: '.btn-novo-chamado',
    position: 'bottom',
    action: 'Criar Chamado',
    link: '/chamados/novo',
  },
  {
    id: 'invite-team',
    title: '👥 Convide sua equipe',
    description: 'Adicione membros da sua equipe para trabalhar juntos.',
    icon: '🤝',
    target: '.btn-convidar',
    position: 'top',
    action: 'Convidar',
    link: '/usuarios',
  },
  {
    id: 'explore',
    title: '🎯 Explore o dashboard',
    description: 'Acompanhe métricas, chamados e vendas em tempo real.',
    icon: '📊',
    target: '.dashboard-grid',
    position: 'top',
    action: 'Explorar',
    link: '/dashboard',
  },
];

export function OnboardingTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Verificar se o tour já foi concluído
    const tourCompleted = localStorage.getItem('onboarding_completed');
    const isNewUser = !localStorage.getItem('onboarding_started');

    if (isNewUser && !tourCompleted) {
      localStorage.setItem('onboarding_started', 'true');
      // Pequeno delay para a página carregar
      setTimeout(() => {
        setIsActive(true);
        setDismissed(false);
      }, 1000);
    }
  }, []);

  const completeStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      finishTour();
    }
  };

  const skipStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      finishTour();
    }
  };

  const finishTour = () => {
    setIsActive(false);
    setDismissed(true);
    localStorage.setItem('onboarding_completed', 'true');
    localStorage.setItem('onboarding_date', new Date().toISOString());
  };

  if (dismissed || !isActive) return null;

  const step = STEPS[currentStep];

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-backdrop" onClick={finishTour} />
      
      <div className={`onboarding-tooltip onboarding-${step.position}`}>
        <div className="onboarding-header">
          <span className="onboarding-step-indicator">
            Passo {currentStep + 1} de {STEPS.length}
          </span>
          <button className="onboarding-close" onClick={finishTour}>
            ✕
          </button>
        </div>

        <div className="onboarding-icon">{step.icon}</div>
        <h3 className="onboarding-title">{step.title}</h3>
        <p className="onboarding-description">{step.description}</p>

        <div className="onboarding-actions">
          <button className="btn btn-outline" onClick={skipStep}>
            Pular
          </button>
          {step.link ? (
            <a href={step.link} className="btn btn-primary" onClick={completeStep}>
              {step.action || 'Continuar'}
            </a>
          ) : (
            <button className="btn btn-primary" onClick={completeStep}>
              {currentStep < STEPS.length - 1 ? 'Próximo' : 'Concluir'}
            </button>
          )}
        </div>

        <div className="onboarding-dots">
          {STEPS.map((_, index) => (
            <span
              key={index}
              className={`dot ${index === currentStep ? 'active' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
```

```css
/* frontend/src/components/OnboardingTour.css */
.onboarding-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.onboarding-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
}

.onboarding-tooltip {
  position: relative;
  background: white;
  border-radius: 16px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.onboarding-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.onboarding-step-indicator {
  font-size: 0.75rem;
  color: #718096;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.onboarding-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #a0aec0;
  cursor: pointer;
  padding: 0.25rem;
  line-height: 1;
}

.onboarding-close:hover {
  color: #4a5568;
}

.onboarding-icon {
  font-size: 3rem;
  text-align: center;
  margin-bottom: 1rem;
}

.onboarding-title {
  font-size: 1.25rem;
  color: #1a202c;
  text-align: center;
  margin-bottom: 0.5rem;
}

.onboarding-description {
  color: #718096;
  text-align: center;
  font-size: 0.875rem;
  line-height: 1.5;
  margin-bottom: 1.5rem;
}

.onboarding-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.onboarding-actions .btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.onboarding-actions .btn-primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
}

.onboarding-actions .btn-outline {
  background: white;
  color: #4a5568;
  border: 1px solid #e2e8f0;
}

.onboarding-dots {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1.5rem;
}

.onboarding-dots .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e2e8f0;
  transition: all 0.2s;
}

.onboarding-dots .dot.active {
  background: #667eea;
  width: 24px;
  border-radius: 4px;
}
```

### 5.3 Implementação Base — Widget de Suporte (Crisp)

```html
<!-- frontend/index.html - Adicionar antes do </body> -->
<script type="text/javascript">
  window.$crisp = [];
  window.CRISP_WEBSITE_ID = "SEU_WEBSITE_ID";
  
  (function() {
    d = document;
    s = d.createElement("script");
    s.src = "https://client.crisp.chat/l.js";
    s.async = 1;
    d.getElementsByTagName("head")[0].appendChild(s);
  })();
</script>
```

```javascript
// frontend/src/lib/supportWidget.js
/**
 * Configura o widget de suporte com dados do usuário logado
 * Chamar após o login
 */
export function configureSupportWidget(user) {
  if (window.$crisp) {
    // Identificar usuário no Crisp
    window.$crisp.push(['set', 'user:email', [user.email]]);
    window.$crisp.push(['set', 'user:nickname', [user.nome]]);
    window.$crisp.push(['set', 'session:data', [
      ['tenant_id', user.tenantId],
      ['role', user.cargo],
    ]]);
  }
}

/**
 * Abrir chat com mensagem pré-definida
 */
export function openSupportChat(message = '') {
  if (window.$crisp) {
    window.$crisp.push(['do', 'chat:open']);
    if (message) {
      window.$crisp.push(['set', 'message:text', [message]]);
    }
  }
}
```

### 5.4 E-mails Automáticos de Onboarding

```javascript
// backend/src/jobs/onboardingEmails.js
const prisma = require('../config/prisma');
const emailService = require('../services/emailService');
const { logger } = require('../config/logger');

/**
 * Job para enviar e-mails automáticos de onboarding
 * 
 * Executar via cron job (agendador):
 * - Todo dia às 8h, verificar tenants que precisam de e-mail
 */
async function processOnboardingEmails() {
  logger.info('[Onboarding] Processando e-mails automáticos');

  const now = new Date();

  // Dia 0: Boas-vindas (já enviado no registro)
  
  // Dia 1: "Crie seu primeiro chamado"
  const day1Users = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        lte: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
      tickets: { none: {} }, // Não criou nenhum chamado ainda
    },
    include: { tenant: true },
  });

  for (const user of day1Users) {
    await emailService.sendEmail({
      to: user.email,
      subject: '📋 Crie seu primeiro chamado no ROTINA',
      html: `
        <h2>Olá ${user.name}!</h2>
        <p>Que tal testar o sistema criando seu primeiro chamado?</p>
        <p>É rápido e fácil:</p>
        <ol>
          <li>Clique em "Novo Chamado"</li>
          <li>Descreva sua solicitação</li>
          <li>Pronto! Você verá o fluxo completo</li>
        </ol>
        <a href="${process.env.APP_URL}/chamados/novo" 
           style="background: #667eea; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 5px;">
          Criar Chamado
        </a>
      `,
    });
  }

  // Dia 3: "Convide sua equipe"
  const day3Users = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
        lte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      tenant: {
        users: { some: { role: 'MEMBER' } }, // Ainda não convidou ninguém
      },
    },
    include: { tenant: true },
  });

  for (const user of day3Users) {
    await emailService.sendEmail({
      to: user.email,
      subject: '👥 Convide sua equipe para o ROTINA',
      html: `
        <h2>${user.name}, sua equipe está esperando!</h2>
        <p>Você já está usando o ROTINA, que tal trazer sua equipe?</p>
        <p>Com mais pessoas, vocês podem:</p>
        <ul>
          <li>Distribuir chamados entre o time</li>
          <li>Compartilhar clientes e vendas</li>
          <li>Acompanhar métricas em equipe</li>
        </ul>
        <a href="${process.env.APP_URL}/usuarios" 
           style="background: #667eea; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 5px;">
          Convidar Equipe
        </a>
      `,
    });
  }

  logger.info({
    day1: day1Users.length,
    day3: day3Users.length,
  }, '[Onboarding] E-mails processados');
}

module.exports = { processOnboardingEmails };
```

### 5.5 Próximos Passos

- [ ] Criar componente `OnboardingTour` com 4 passos
- [ ] Salvar progresso no localStorage
- [ ] Configurar Crisp/HelpScout (widget de chat)
- [ ] Adicionar `configureSupportWidget()` no login
- [ ] Criar job de e-mails automáticos de onboarding
- [ ] Configurar cron job para executar diariamente
- [ ] Criar página de "Primeiros Passos" no dashboard
- [ ] Adicionar botão "Ajuda" no menu lateral

---

## Resumo dos Arquivos a Criar

| # | Arquivo | Descrição | Prioridade |
|---|---------|-----------|------------|
| 1 | `backend/src/config/logger.js` | Logs estruturados com Pino | 🔴 Alta |
| 2 | `backend/src/config/sentry.js` | Error tracking com Sentry | 🔴 Alta |
| 3 | `backend/src/services/emailService.js` | Templates de e-mail transacional | 🔴 Alta |
| 4 | `backend/src/services/dataExportService.js` | Exportação/exclusão LGPD | 🟡 Média |
| 5 | `backend/src/routes/privacy.js` | Endpoints de privacidade | 🟡 Média |
| 6 | `backend/src/services/auditService.js` | Audit logs | 🟡 Média |
| 7 | `backend/src/middleware/audit.js` | Middleware de auditoria | 🟡 Média |
| 8 | `frontend/src/components/OnboardingTour.jsx` | Tour guiado | 🟢 Baixa |
| 9 | `frontend/src/lib/supportWidget.js` | Widget de suporte | 🟢 Baixa |
| 10 | `backend/src/jobs/onboardingEmails.js` | E-mails automáticos | 🟢 Baixa |

## Configurações de Ambiente

```env
# ============================================
# Observabilidade
# ============================================
SENTRY_DSN="https://xxxx@sentry.io/xxxx"
VITE_SENTRY_DSN="https://xxxx@sentry.io/xxxx"
LOG_LEVEL="info"

# ============================================
# E-mail (Resend)
# ============================================
RESEND_API_KEY="re_xxxx"
EMAIL_FROM="ROTINA <noreply@rotina.com.br>"

# ============================================
# App
# ============================================
APP_URL="https://app.rotina.com.br"
VITE_APP_URL="https://app.rotina.com.br"
VITE_CRISP_WEBSITE_ID="xxxx-xxxx-xxxx"