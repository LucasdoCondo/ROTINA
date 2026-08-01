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
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + 30);
    const nextDueDateStr = nextDueDate.toISOString().split('T')[0];

    // 4. Criar assinatura no Asaas
    const asaasSubscription = await asaasService.createSubscription({
      customerId: asaasCustomerId,
      billingType,
      value: plan.price,
      nextDueDate: nextDueDateStr,
      description: `Plano ${plan.name} - ROTINA`,
      cycle: 'MONTHLY',
      metadata: { tenantId: tenant.id, planId }
    });

    // 5. Calcular período atual
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);

    // 6. Salvar/atualizar no banco
    const subscription = await prisma.subscription.upsert({
      where: { tenantId: tenant.id },
      update: {
        gateway: 'asaas',
        asaasCustomerId,
        asaasSubscriptionId: asaasSubscription.id,
        status: 'INCOMPLETE',
        planId,
        currentPeriodEnd,
        lastInvoiceUrl: asaasSubscription.invoiceUrl || null
      },
      create: {
        tenantId: tenant.id,
        gateway: 'asaas',
        asaasCustomerId,
        asaasSubscriptionId: asaasSubscription.id,
        status: 'INCOMPLETE',
        planId,
        currentPeriodEnd
      }
    });

    // 7. Atualizar plano do tenant
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { plan: planId }
    });

    return {
      subscription,
      checkout: {
        id: asaasSubscription.id,
        invoiceUrl: asaasSubscription.invoiceUrl,
        billingType,
        value: plan.price,
        nextDueDate: nextDueDateStr
      }
    };
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
  async processWebhookEvent(event) {
    console.log(`[Webhook] Processando evento: ${event.type}`, {
      subscriptionId: event.subscriptionId,
      tenantId: event.tenantId
    });

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
        console.log(`[Webhook] Evento não mapeado: ${event.type}`);
        return { received: true, unhandled: event.type };
    }
  },

  /**
   * Processa pagamento confirmado com sucesso
   */
  async _handlePaymentSucceeded(event) {
    const { subscriptionId, tenantId, confirmedDate } = event;

    // Se não veio o tenantId no metadata, buscar pelo subscriptionId
    let targetTenantId = tenantId;

    if (!targetTenantId && subscriptionId) {
      const sub = await prisma.subscription.findUnique({
        where: { asaasSubscriptionId: subscriptionId }
      });
      targetTenantId = sub?.tenantId;
    }

    if (!targetTenantId) {
      console.error('[Webhook] Tenant não identificado para o pagamento');
      return { received: true, error: 'TENANT_NOT_FOUND' };
    }

    // Calcular novo período (30 dias a partir de hoje ou da confirmação)
    const periodStart = confirmedDate ? new Date(confirmedDate) : new Date();
    const currentPeriodEnd = new Date(periodStart);
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);

    // Atualizar assinatura para ACTIVE
    const subscription = await prisma.subscription.update({
      where: { tenantId: targetTenantId },
      data: {
        status: 'ACTIVE',
        currentPeriodEnd,
        paymentAttempts: 0,
        lastPaymentAttempt: new Date(),
        lastInvoiceUrl: event.invoiceUrl || undefined
      }
    });

    // Garantir que o tenant está ativo
    await prisma.tenant.update({
      where: { id: targetTenantId },
      data: { active: true }
    });

    console.log(`[Webhook] ✅ Assinatura ativada para tenant ${targetTenantId}`);
    
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

    let targetTenantId = tenantId;

    if (!targetTenantId && subscriptionId) {
      const sub = await prisma.subscription.findUnique({
        where: { asaasSubscriptionId: subscriptionId }
      });
      targetTenantId = sub?.tenantId;
    }

    if (!targetTenantId) {
      return { received: true, error: 'TENANT_NOT_FOUND' };
    }

    // Marcar como PAST_DUE - o sistema ainda funciona
    // mas o middleware validateSubscription vai bloquear
    await prisma.subscription.update({
      where: { tenantId: targetTenantId },
      data: {
        status: 'PAST_DUE',
        paymentAttempts: { increment: 1 },
        lastPaymentAttempt: new Date()
      }
    });

    console.log(`[Webhook] ⚠️ Pagamento vencido para tenant ${targetTenantId}`);

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

    let targetTenantId = tenantId;

    if (!targetTenantId && subscriptionId) {
      const sub = await prisma.subscription.findUnique({
        where: { asaasSubscriptionId: subscriptionId }
      });
      targetTenantId = sub?.tenantId;
    }

    if (!targetTenantId) {
      return { received: true, error: 'TENANT_NOT_FOUND' };
    }

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

    console.log(`[Webhook] 🚫 Assinatura cancelada para tenant ${targetTenantId}`);

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

    let targetTenantId = tenantId;

    if (!targetTenantId && subscriptionId) {
      const sub = await prisma.subscription.findUnique({
        where: { asaasSubscriptionId: subscriptionId }
      });
      targetTenantId = sub?.tenantId;
    }

    if (!targetTenantId) {
      return { received: true, error: 'TENANT_NOT_FOUND' };
    }

    const currentPeriodEnd = new Date();
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);

    await prisma.subscription.update({
      where: { tenantId: targetTenantId },
      data: {
        status: 'ACTIVE',
        currentPeriodEnd
      }
    });

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

    let targetTenantId = tenantId;

    if (!targetTenantId && subscriptionId) {
      const sub = await prisma.subscription.findUnique({
        where: { asaasSubscriptionId: subscriptionId }
      });
      targetTenantId = sub?.tenantId;
    }

    if (!targetTenantId) {
      return { received: true, error: 'TENANT_NOT_FOUND' };
    }

    await prisma.subscription.update({
      where: { tenantId: targetTenantId },
      data: { status: 'PAST_DUE' }
    });

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

    let targetTenantId = tenantId;

    if (!targetTenantId && subscriptionId) {
      const sub = await prisma.subscription.findUnique({
        where: { asaasSubscriptionId: subscriptionId }
      });
      targetTenantId = sub?.tenantId;
    }

    if (!targetTenantId) {
      return { received: true, error: 'TENANT_NOT_FOUND' };
    }

    // Em caso de chargeback, cancelar imediatamente
    await prisma.subscription.update({
      where: { tenantId: targetTenantId },
      data: { status: 'CANCELED' }
    });

    await prisma.tenant.update({
      where: { id: targetTenantId },
      data: { active: false }
    });

    console.log(`[Webhook] 🔄 Chargeback/reembolso para tenant ${targetTenantId}`);

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
        daysRemaining: Math.ceil((subscription.currentPeriodEnd - now) / (1000 * 60 * 60 * 24))
      };
    }

    if (subscription.status === 'INCOMPLETE' || subscription.status === 'TRIALING') {
      return {
        hasAccess: true,
        status: subscription.status,
        currentPeriodEnd: subscription.currentPeriodEnd,
        daysRemaining: Math.ceil((subscription.currentPeriodEnd - now) / (1000 * 60 * 60 * 24))
      };
    }

    if (subscription.status === 'PAST_DUE' || isExpired) {
      return {
        hasAccess: false,
        status: 'PAST_DUE',
        message: 'Pagamento pendente. Acesse o link de fatura para regularizar.',
        invoiceUrl: subscription.lastInvoiceUrl
      };
    }

    if (subscription.status === 'CANCELED') {
      return {
        hasAccess: false,
        status: 'CANCELED',
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