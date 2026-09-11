/**
 * Serviço de Assinatura - Gerencia o ciclo de vida completo das assinaturas
 * 
 * Fluxo:
 * 1. Tenant escolhe plano → backend cria checkout
 * 2. Usuário paga no gateway (Asaas/Stripe)
 * 3. Gateway envia webhook → backend atualiza status
 * 4. Middleware validateSubscription bloqueia se não estiver ACTIVE
 * 
 * Regra de ouro: NUNCA confie no retorno síncrono do frontend
 * para liberar acesso. O status REAL vem do webhook.
 */

const prisma = require('../config/prisma');
const asaasService = require('./asaasService');
const emailService = require('./emailService');
const { logger } = require('../config/logger');
const { logAudit } = require('../utils/auditLogger');

// ============================================
// Métodos de pagamento suportados (Asaas)
// ============================================
const BILLING_TYPES = ['PIX', 'BOLETO', 'CREDIT_CARD'];

/**
 * Suma dias a uma data (evita mutar o objeto original).
 * @param {Date} date - Data base
 * @param {number} days - Dias a adicionar
 * @returns {Date} Nova data
 */
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// ============================================
// Planos Disponíveis
// ============================================

const PLANS = {
  basic: {
    id: 'basic',
    name: 'Básico',
    price: 49.90,
    description: 'Para pequenas empresas',
    features: [
      'Até 3 usuários',
      'Gestão de chamados',
      'CRM básico',
      'Relatórios simples'
    ],
    moduleLimits: {
      tickets: true,
      clients: true,
      products: false,
      orders: false,
      members: false
    }
  },
  pro: {
    id: 'pro',
    name: 'Profissional',
    price: 99.90,
    description: 'Para empresas em crescimento',
    features: [
      'Até 10 usuários',
      'Gestão de chamados',
      'CRM completo',
      'Produtos e estoque',
      'Pedidos e vendas',
      'Relatórios avançados'
    ],
    moduleLimits: {
      tickets: true,
      clients: true,
      products: true,
      orders: true,
      members: false
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199.90,
    description: 'Para grandes empresas',
    features: [
      'Usuários ilimitados',
      'Todos os módulos',
      'Membros e assinaturas',
      'API dedicada',
      'Suporte prioritário',
      'SLA 99.9%'
    ],
    moduleLimits: {
      tickets: true,
      clients: true,
      products: true,
      orders: true,
      members: true
    }
  }
};

const subscriptionService = {
  /**
   * Retorna a lista de planos disponíveis
   */
  getPlans() {
    return Object.values(PLANS);
  },

  /**
   * Retorna os detalhes de um plano
   * @param {string} planId - ID do plano
   */
  getPlan(planId) {
    return PLANS[planId] || null;
  },

  /**
   * Cria uma nova assinatura para um tenant
   * 
   * Fluxo:
   * 1. Cria cliente no Asaas (se não existir)
   * 2. Cria assinatura recorrente no Asaas
   * 3. Salva no banco com status INCOMPLETE
   * 4. Retorna dados para redirecionar ao checkout
   * 
   * @param {Object} tenant - Dados do tenant
   * @param {string} planId - ID do plano escolhido
   * @param {string} billingType - 'PIX' | 'BOLETO' | 'CREDIT_CARD'
   * @returns {Promise<Object>} Dados da assinatura criada
   */
  async createSubscription(tenant, planId, billingType = 'PIX') {
    const plan = PLANS[planId];
    if (!plan) {
      throw new Error('PLAN_NOT_FOUND');
    }

    // Validar método de pagamento
    if (!BILLING_TYPES.includes(billingType)) {
      throw new Error('INVALID_BILLING_TYPE');
    }

    // 1. Verificar se já existe assinatura
    const existingSubscription = await prisma.subscription.findUnique({
      where: { tenantId: tenant.id }
    });

    if (existingSubscription && existingSubscription.status === 'ACTIVE') {
      throw new Error('SUBSCRIPTION_ALREADY_ACTIVE');
    }

    // 2. Criar ou reutilizar cliente no Asaas
    let asaasCustomerId = existingSubscription?.asaasCustomerId;

    if (!asaasCustomerId) {
      const customer = await asaasService.createCustomer(tenant);
      asaasCustomerId = customer.id;
    }

    // 3. Calcular próximo vencimento (30 dias a partir de hoje)
    const nextDueDate = addDays(new Date(), 30);
    const nextDueDateStr = nextDueDate.toISOString().split('T')[0];

    // 4. Reutilizar ou criar assinatura remota no Asaas
    let asaasSubscription = null;
    const existingAsaasSubscriptionId = existingSubscription?.asaasSubscriptionId;

    if (existingSubscription && existingAsaasSubscriptionId && existingSubscription.status !== 'CANCELED') {
      // Reutilizar a assinatura existente (INCOMPLETE / PAST_DUE / TRIALING)
      asaasSubscription = { id: existingAsaasSubscriptionId };
      try {
        const remote = await asaasService.getSubscription(existingAsaasSubscriptionId);
        asaasSubscription = remote;
      } catch (err) {
        logger.warn({ err: err.message }, '[Asaas] Não foi possível ler a assinatura remota; usa-se o ID local');
      }
    } else {
      // Cancelar a assinatura anterior (se existe e não se reutiliza)
      if (existingAsaasSubscriptionId) {
        try {
          await asaasService.cancelSubscription(existingAsaasSubscriptionId);
        } catch (err) {
          logger.warn({ err: err.message }, '[Asaas] Não foi possível cancelar a assinatura anterior');
        }
      }

      // Criar nova assinatura no Asaas com o método de pagamento escolhido
      asaasSubscription = await asaasService.createSubscription({
        customerId: asaasCustomerId,
        billingType,
        value: plan.price,
        nextDueDate: nextDueDateStr,
        description: `Plano ${plan.name} - ROTINA`,
        cycle: 'MONTHLY',
        metadata: { tenantId: tenant.id, planId }
      });
    }

    // 5. Obtener la cobranza pendiente (link de pagamento / QR PIX / boleto)
    let payment = null;
    try {
      payment = await asaasService.getPendingPayment(asaasSubscription.id);
    } catch (err) {
      logger.warn({ err: err.message }, '[Asaas] Não foi possível obter a cobranza pendiente');
    }

    // Fallback: criar um Payment Link manual si não existe cobranza automática
    if (!payment) {
      try {
        const link = await asaasService.createPaymentLink({
          name: `Plano ${plan.name} - ROTINA`,
          description: `Assinatura ${plan.name} · ${billingType}`,
          value: plan.price,
          billingType,
          dueDate: nextDueDateStr,
          externalReference: tenant.id,
          subscriptionId: asaasSubscription.id,
        });
        payment = {
          id: link.id,
          invoiceUrl: link.url,
          pixQrCode: link.pixQrCode,
          pixKey: link.pixKey,
          bankSlip: link.bankSlip,
        };
      } catch (err) {
        logger.warn({ err: err.message }, '[Asaas] Não foi possível criar payment link; usa-se invoiceUrl da assinatura');
        payment = {
          id: null,
          invoiceUrl: asaasSubscription.paymentLink || asaasSubscription.invoiceUrl,
          pixQrCode: null,
          pixKey: null,
          bankSlip: null,
        };
      }
    }

    // 6. Calcular período atual (30 dias desde hoje)
    const currentPeriodEnd = addDays(new Date(), 30);

    // 7. Salvar/atualizar no banco (sempre INCOMPLETE até chegar o webhook)
    const subscription = await prisma.subscription.upsert({
      where: { tenantId: tenant.id },
      update: {
        gateway: 'asaas',
        asaasCustomerId,
        asaasSubscriptionId: asaasSubscription.id,
        status: 'INCOMPLETE',
        planId,
        billingType,
        currentPeriodEnd,
        lastInvoiceUrl: payment?.invoiceUrl || asaasSubscription.invoiceUrl || null
      },
      create: {
        tenantId: tenant.id,
        gateway: 'asaas',
        asaasCustomerId,
        asaasSubscriptionId: asaasSubscription.id,
        status: 'INCOMPLETE',
        planId,
        billingType,
        currentPeriodEnd
      }
    });

    // 8. Atualizar plano do tenant
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { plan: planId }
    });

    // Construir payload de checkout específico por método de pagamento
    const checkout = {
      id: asaasSubscription.id,
      paymentId: payment?.id,
      invoiceUrl: payment?.invoiceUrl || asaasSubscription.invoiceUrl,
      billingType,
      value: plan.price,
      nextDueDate: nextDueDateStr,
      pixQrCode: billingType === 'PIX' ? (payment?.pixQrCode || payment?.pix?.qrCode) : null,
      pixKey: billingType === 'PIX' ? (payment?.pixKey || payment?.pix?.key) : null,
      bankSlipUrl: billingType === 'BOLETO' ? (payment?.bankSlip?.url || payment?.bankSlip) : null,
      cardInstallments: billingType === 'CREDIT_CARD' ? (payment?.card?.installmentCount || 1) : null,
    };

    logger.info(
      { tenantId: tenant.id, planId, billingType, hasInvoice: !!checkout.invoiceUrl },
      '[Checkout] Checkout criado'
    );

    return { subscription, checkout };
  },

  /**
   * Processa webhook de pagamento recebido do Asaas
   * 
   * Regra de ouro: NUNCA confie no frontend para liberar acesso.
   * O status REAL da assinatura é confirmado ASSINCRONAMENTE via Webhook.
   * 
   * @param {Object} event - Evento normalizado do Asaas
   * @returns {Promise<Object>} Resultado do processamento
   */
  /**
   * 🔐 IDEMPOTÊNCIA (anti-replay): verifica se um pagamento já foi processado.
   * Gateways usam entrega "at-least-once" — o mesmo PAYMENT_CONFIRMED pode
   * chegar 2+ vezes. Reprocessá-lo estenderia o período da assinatura
   * repetidamente (ataque de replay + receita indevida).
   *
   * @param {string} paymentId - ID do pagamento no gateway
   * @returns {Promise<boolean>} true se já processado
   */
  async isPaymentProcessed(paymentId) {
    if (!paymentId) return false;
    const found = await prisma.processedWebhook.findUnique({
      where: { paymentId },
    });
    return Boolean(found);
  },

  /**
   * Registra um pagamento como processado (marca d'água de idempotência).
   * Falha ao gravar NUNCA deve interromper a resposta ao gateway.
   *
   * @param {Object} event - Evento normalizado do webhook
   * @returns {Promise<void>}
   */
  async markPaymentProcessed(event) {
    if (!event?.paymentId) return;
    try {
      await prisma.processedWebhook.create({
        data: {
          paymentId: event.paymentId,
          type: event.type || 'unknown',
        },
      });
    } catch (error) {
      // Violação de unique = webhook concorrente já registrou (ok, inofensivo)
      logger.warn(
        { paymentId: event.paymentId, error: error.message },
        '[Webhook] Não foi possível registrar marca de idempotência'
      );
    }
  },

  async processWebhookEvent(event) {
    logger.info(
      { eventType: event.type, subscriptionId: event.subscriptionId, tenantId: event.tenantId },
      '[Webhook] Processando evento'
    );

    switch (event.type) {
      // ═══════════════════════════════════════════════
      // PAGAMENTO CONFIRMADO / RECEBIDO
      // Ativa a assinatura e libera o acesso
      // ═══════════════════════════════════════════════
      case 'payment.succeeded': {
        return await this._handlePaymentSucceeded(event);
      }

      // ═══════════════════════════════════════════════
      // PAGAMENTO VENCIDO (boleto não pago, PIX não quitado)
      // Marca como PAST_DUE - sistema ainda funciona por alguns dias
      // ═══════════════════════════════════════════════
      case 'payment.past_due': {
        return await this._handlePaymentPastDue(event);
      }

      // ═══════════════════════════════════════════════
      // ASSINATURA CANCELADA
      // Bloqueia o acesso imediatamente
      // ═══════════════════════════════════════════════
      case 'subscription.canceled': {
        return await this._handleSubscriptionCanceled(event);
      }

      // ═══════════════════════════════════════════════
      // ASSINATURA CRIADA / ATIVADA
      // ═══════════════════════════════════════════════
      case 'subscription.created':
      case 'subscription.activated': {
        return await this._handleSubscriptionActivated(event);
      }

      // ═══════════════════════════════════════════════
      // ASSINATURA SUSPENSA (inadimplência)
      // ═══════════════════════════════════════════════
      case 'subscription.suspended': {
        return await this._handleSubscriptionSuspended(event);
      }

      // ═══════════════════════════════════════════════
      // PAGAMENTO REEMBOLSADO / CHARGEBACK
      // ═══════════════════════════════════════════════
      case 'payment.refunded':
      case 'payment.chargeback': {
        return await this._handlePaymentRefunded(event);
      }

      default:
        logger.info({ eventType: event.type }, '[Webhook] Evento não mapeado');
        return { received: true, unhandled: event.type };
    }
  },

  /**
   * Resuelve o tenantId a partir do evento.
   * Prioridade: metadata do gateway (externalReference) → lookup por subscriptionId.
   * NUNCA recebe tenantId como input confiable do cliente.
   *
   * @param {Object} event - Evento normalizado
   * @param {string} [subscriptionId] - ID da assinatura no gateway
   * @param {string} [tenantIdHint] - TenantId vindo do metadata do gateway
   * @returns {Promise<string|null>}
   */
  async _resolveTenantFromEvent(event, subscriptionId, tenantIdHint) {
    if (tenantIdHint) return tenantIdHint;

    if (subscriptionId) {
      const sub = await prisma.subscription.findFirst({
        where: {
          OR: [
            { asaasSubscriptionId: subscriptionId },
            { stripeSubscriptionId: subscriptionId },
          ],
        },
        select: { tenantId: true },
      });
      return sub?.tenantId;
    }

    return null;
  },

  /**
   * Obtiene el currentPeriodEnd actual de la suscripción de um tenant
   * @param {string} tenantId
   * @returns {Promise<Date|null>}
   */
  async _getPeriodEnd(tenantId) {
    const sub = await prisma.subscription.findUnique({
      where: { tenantId },
      select: { currentPeriodEnd: true },
    });
    return sub?.currentPeriodEnd;
  },

  /**
   * Processa pagamento confirmado com sucesso
   */
  async _handlePaymentSucceeded(event) {
    const { subscriptionId, tenantId, confirmedDate, invoiceUrl } = event;

    const targetTenantId = await this._resolveTenantFromEvent(event, subscriptionId, tenantId);
    if (!targetTenantId) {
      logger.error('[Webhook] Tenant não identificado para o pagamento');
      return { received: true, error: 'TENANT_NOT_FOUND' };
    }

    // Calcular novo período (30 dias) a partir da confirmação,
    // garantindo que NUNCA seja menor que o período anterior (evita regressão)
    const periodStart = confirmedDate ? new Date(confirmedDate) : new Date();
    const previousPeriodEnd = await this._getPeriodEnd(targetTenantId);
    const basePeriod = previousPeriodEnd && new Date(previousPeriodEnd) > periodStart
      ? new Date(previousPeriodEnd)
      : periodStart;
    const currentPeriodEnd = addDays(basePeriod, 30);

    // Estado anterior para audit log
    const previous = await prisma.subscription.findUnique({
      where: { tenantId: targetTenantId }
    });

    // Atualizar assinatura para ACTIVE
    await prisma.subscription.update({
      where: { tenantId: targetTenantId },
      data: {
        status: 'ACTIVE',
        currentPeriodEnd,
        paymentAttempts: 0,
        lastPaymentAttempt: new Date(),
        lastInvoiceUrl: invoiceUrl || previous?.lastInvoiceUrl
      }
    });

    // Garantir que o tenant está ativo
    await prisma.tenant.update({
      where: { id: targetTenantId },
      data: { active: true }
    });

    // 📝 Audit Log (campos sensibles sanitizados pelo auditLogger)
    logAudit({
      tenantId: targetTenantId,
      userId: null,
      userEmail: 'webhook@asaas',
      action: 'UPDATE',
      entity: 'Subscription',
      entityId: subscriptionId || previous?.id,
      oldValues: previous
        ? { status: previous.status, currentPeriodEnd: previous.currentPeriodEnd, paymentAttempts: previous.paymentAttempts }
        : undefined,
      newValues: { status: 'ACTIVE', currentPeriodEnd, billingType: event.billingType || undefined },
    });

    // 📧 Fatura paga (assíncrono — nunca deve bloquear o webhook)
    try {
      const tenant = await prisma.tenant.findUnique({ where: { id: targetTenantId } });
      const sub = await prisma.subscription.findUnique({ where: { tenantId: targetTenantId } });
      if (tenant && sub) {
        const plan = PLANS[sub.planId];
        emailService.sendInvoice(tenant, {
          id: event.paymentId || sub.id,
          planName: plan?.name || sub.planId,
          amount: event.value || plan?.price,
          dueDate: event.dueDate || new Date().toLocaleDateString('pt-BR'),
          status: 'paid',
          invoiceUrl: invoiceUrl || sub.lastInvoiceUrl,
          billingType: event.billingType || sub.billingType || 'PIX',
        });
      }
    } catch (err) {
      logger.warn({ err: err.message }, '[Webhook] Não foi possível enviar fatura paga');
    }

    logger.info({ tenantId: targetTenantId }, '[Webhook] ✅ Assinatura ativada');

    return {
      received: true,
      action: 'SUBSCRIPTION_ACTIVATED',
      tenantId: targetTenantId,
      currentPeriodEnd
    };
  },

  /**
   * Processa pagamento vencido (boleto não pago, PIX não quitado)
   */
  async _handlePaymentPastDue(event) {
    const { subscriptionId, tenantId } = event;

    const targetTenantId = await this._resolveTenantFromEvent(event, subscriptionId, tenantId);
    if (!targetTenantId) {
      return { received: true, error: 'TENANT_NOT_FOUND' };
    }

    // Estado anterior para audit log
    const previous = await prisma.subscription.findUnique({
      where: { tenantId: targetTenantId }
    });

    // Marcar como PAST_DUE — o middleware validateSubscription bloquea o acesso
    const updated = await prisma.subscription.update({
      where: { tenantId: targetTenantId },
      data: {
        status: 'PAST_DUE',
        paymentAttempts: { increment: 1 },
        lastPaymentAttempt: new Date(),
        lastInvoiceUrl: event.invoiceUrl || previous?.lastInvoiceUrl || undefined
      }
    });

    // 📝 Audit Log
    logAudit({
      tenantId: targetTenantId,
      userId: null,
      userEmail: 'webhook@asaas',
      action: 'UPDATE',
      entity: 'Subscription',
      entityId: subscriptionId || previous?.id,
      oldValues: previous
        ? { status: previous.status, paymentAttempts: previous.paymentAttempts }
        : undefined,
      newValues: { status: 'PAST_DUE', paymentAttempts: updated.paymentAttempts },
    });

    // 📧 Alerta de pagamento não aprovado (assíncrono)
    try {
      const tenant = await prisma.tenant.findUnique({ where: { id: targetTenantId } });
      const sub = await prisma.subscription.findUnique({ where: { tenantId: targetTenantId } });
      if (tenant && sub) {
        const plan = PLANS[sub.planId];
        emailService.sendPaymentFailed(tenant, {
          planId: plan?.name || sub.planId,
          value: event.value || plan?.price,
          dueDate: event.dueDate,
          lastInvoiceUrl: sub.lastInvoiceUrl,
          paymentAttempts: sub.paymentAttempts || 1,
        });
      }
    } catch (err) {
      logger.warn({ err: err.message }, '[Webhook] Não foi possível enviar alerta de pagamento');
    }

    logger.info({ tenantId: targetTenantId }, '[Webhook] ⚠️ Pagamento vencido');

    return {
      received: true,
      action: 'PAYMENT_PAST_DUE',
      tenantId: targetTenantId
    };
  },

  /**
   * Processa cancelamento de assinatura
   */
  async _handleSubscriptionCanceled(event) {
    const { subscriptionId, tenantId } = event;

    const targetTenantId = await this._resolveTenantFromEvent(event, subscriptionId, tenantId);
    if (!targetTenantId) {
      return { received: true, error: 'TENANT_NOT_FOUND' };
    }

    // Estado anterior para audit log
    const previous = await prisma.subscription.findUnique({
      where: { tenantId: targetTenantId }
    });

    // Cancelar assinatura e desativar tenant
    await prisma.subscription.update({
      where: { tenantId: targetTenantId },
      data: { status: 'CANCELED' }
    });

    // Desativar o tenant (bloqueia acesso de todos os usuários)
    await prisma.tenant.update({
      where: { id: targetTenantId },
      data: { active: false }
    });

    // 📝 Audit Log
    logAudit({
      tenantId: targetTenantId,
      userId: null,
      userEmail: 'webhook@asaas',
      action: 'UPDATE',
      entity: 'Subscription',
      entityId: subscriptionId || previous?.id,
      oldValues: previous ? { status: previous.status } : undefined,
      newValues: { status: 'CANCELED', tenantActive: false },
    });

    logger.info({ tenantId: targetTenantId }, '[Webhook] 🚫 Assinatura cancelada');

    return {
      received: true,
      action: 'SUBSCRIPTION_CANCELED',
      tenantId: targetTenantId
    };
  },

  /**
   * Processa ativação de assinatura
   */
  async _handleSubscriptionActivated(event) {
    const { subscriptionId, tenantId } = event;

    const targetTenantId = await this._resolveTenantFromEvent(event, subscriptionId, tenantId);
    if (!targetTenantId) {
      return { received: true, error: 'TENANT_NOT_FOUND' };
    }

    const previous = await prisma.subscription.findUnique({
      where: { tenantId: targetTenantId }
    });

    const currentPeriodEnd = addDays(new Date(), 30);

    await prisma.subscription.update({
      where: { tenantId: targetTenantId },
      data: {
        status: 'ACTIVE',
        currentPeriodEnd
      }
    });

    // 📝 Audit Log
    logAudit({
      tenantId: targetTenantId,
      userId: null,
      userEmail: 'webhook@asaas',
      action: 'UPDATE',
      entity: 'Subscription',
      entityId: subscriptionId || previous?.id,
      oldValues: previous ? { status: previous.status } : undefined,
      newValues: { status: 'ACTIVE', currentPeriodEnd },
    });

    logger.info({ tenantId: targetTenantId }, '[Webhook] ♻️ Assinatura ativada');

    return {
      received: true,
      action: 'SUBSCRIPTION_ACTIVATED',
      tenantId: targetTenantId
    };
  },

  /**
   * Processa suspensão de assinatura por inadimplência
   */
  async _handleSubscriptionSuspended(event) {
    const { subscriptionId, tenantId } = event;

    const targetTenantId = await this._resolveTenantFromEvent(event, subscriptionId, tenantId);
    if (!targetTenantId) {
      return { received: true, error: 'TENANT_NOT_FOUND' };
    }

    const previous = await prisma.subscription.findUnique({
      where: { tenantId: targetTenantId }
    });

    // Suspensão por inadimplência/administrativa → INCOMPLETE.
    // O middleware validateSubscription bloquea este status.
    await prisma.subscription.update({
      where: { tenantId: targetTenantId },
      data: { status: 'INCOMPLETE' }
    });

    // 📝 Audit Log
    logAudit({
      tenantId: targetTenantId,
      userId: null,
      userEmail: 'webhook@asaas',
      action: 'UPDATE',
      entity: 'Subscription',
      entityId: subscriptionId || previous?.id,
      oldValues: previous ? { status: previous.status } : undefined,
      newValues: { status: 'INCOMPLETE' },
    });

    logger.info({ tenantId: targetTenantId }, '[Webhook] ⛔ Assinatura suspensa (INCOMPLETE)');

    return {
      received: true,
      action: 'SUBSCRIPTION_SUSPENDED',
      tenantId: targetTenantId
    };
  },

  /**
   * Processa reembolso ou chargeback
   */
  async _handlePaymentRefunded(event) {
    const { subscriptionId, tenantId } = event;

    const targetTenantId = await this._resolveTenantFromEvent(event, subscriptionId, tenantId);
    if (!targetTenantId) {
      return { received: true, error: 'TENANT_NOT_FOUND' };
    }

    const previous = await prisma.subscription.findUnique({
      where: { tenantId: targetTenantId }
    });

    // Em caso de chargeback, cancelar imediatamente
    await prisma.subscription.update({
      where: { tenantId: targetTenantId },
      data: { status: 'CANCELED' }
    });

    await prisma.tenant.update({
      where: { id: targetTenantId },
      data: { active: false }
    });

    // 📝 Audit Log
    logAudit({
      tenantId: targetTenantId,
      userId: null,
      userEmail: 'webhook@asaas',
      action: 'UPDATE',
      entity: 'Subscription',
      entityId: subscriptionId || previous?.id,
      oldValues: previous ? { status: previous.status } : undefined,
      newValues: { status: 'CANCELED', reason: 'REFUND_CHARGEBACK', tenantActive: false },
    });

    logger.info({ tenantId: targetTenantId }, '[Webhook] 🔄 Chargeback/reembolso');

    return {
      received: true,
      action: 'SUBSCRIPTION_CANCELED',
      tenantId: targetTenantId
    };
  },

  /**
   * Cancela uma assinatura manualmente (pelo admin)
   * @param {string} tenantId - ID do tenant
   */
  async cancelManually(tenantId) {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId }
    });

    if (!subscription) {
      throw new Error('SUBSCRIPTION_NOT_FOUND');
    }

    // Cancelar no Asaas
    if (subscription.asaasSubscriptionId) {
      await asaasService.cancelSubscription(subscription.asaasSubscriptionId);
    }

    // Atualizar banco
    await prisma.subscription.update({
      where: { tenantId },
      data: { status: 'CANCELED' }
    });

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { active: false }
    });

    // 📝 Audit Log (cancelamento manual por ADMIN)
    logAudit({
      tenantId,
      userId: null,
      userEmail: 'manual-admin',
      action: 'UPDATE',
      entity: 'Subscription',
      entityId: subscription.id,
      oldValues: { status: subscription.status, planId: subscription.planId },
      newValues: { status: 'CANCELED', reason: 'MANUAL_CANCEL' },
    });

    return { success: true };
  },

  /**
   * Verifica se um tenant tem acesso ativo
   * @param {string} tenantId - ID do tenant
   * @returns {Promise<Object>} Status da assinatura
   */
  async checkAccess(tenantId) {
    const subscription = await prisma.subscription.findUnique({
      where: { tenantId }
    });

    if (!subscription) {
      return {
        hasAccess: false,
        status: 'NO_SUBSCRIPTION',
        message: 'Nenhuma assinatura encontrada'
      };
    }

    const now = new Date();
    const isExpired = now > subscription.currentPeriodEnd;

    // INCOMPLETE e TRIALING são considerados acesso liberado
    // (período de teste/onboarding antes do primeiro pagamento)
    if (subscription.status === 'ACTIVE' && !isExpired) {
      return {
        hasAccess: true,
        status: 'ACTIVE',
        currentPeriodEnd: subscription.currentPeriodEnd,
        billingType: subscription.billingType,
        daysRemaining: Math.ceil((subscription.currentPeriodEnd - now) / (1000 * 60 * 60 * 24))
      };
    }

    if (subscription.status === 'INCOMPLETE' || subscription.status === 'TRIALING') {
      return {
        hasAccess: true,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        billingType: subscription.billingType,
        daysRemaining: Math.ceil((subscription.currentPeriodEnd - now) / (1000 * 60 * 60 * 24))
      };
    }

    if (subscription.status === 'PAST_DUE' || isExpired) {
      return {
        hasAccess: false,
        status: 'PAST_DUE',
        billingType: subscription.billingType,
        message: 'Pagamento pendente. Acesse o link de fatura para regularizar.',
        invoiceUrl: subscription.lastInvoiceUrl
      };
    }

    if (subscription.status === 'CANCELED') {
      return {
        hasAccess: false,
        status: 'CANCELED',
        billingType: subscription.billingType,
        message: 'Assinatura cancelada. Contate o suporte para reativar.'
      };
    }

    return {
      hasAccess: false,
      status: subscription.status,
      message: 'Assinatura não está ativa.'
    };
  }
};

module.exports = {
  subscriptionService,
  PLANS
};