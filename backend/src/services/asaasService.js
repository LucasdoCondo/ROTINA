/**
 * Serviço de integração com Asaas (Gateway de Pagamento Brasileiro)
 * 
 * Suporta: PIX, Boleto, Cartão de Crédito (recorrência)
 * Documentação: https://docs.asaas.com
 */

const axios = require('axios');

const ASAAS_API_URL = process.env.ASAAS_ENV === 'production'
  ? 'https://api.asaas.com/v3'
  : 'https://sandbox.asaas.com/api/v3';

const asaas = axios.create({
  baseURL: ASAAS_API_URL,
  headers: {
    'access_token': process.env.ASAAS_API_KEY,
    'Content-Type': 'application/json'
  }
});

const asaasService = {
  /**
   * Cria um cliente no Asaas
   * @param {Object} tenant - Dados do tenant
   * @returns {Promise<Object>} Cliente criado
   */
  async createCustomer(tenant) {
    const { data } = await asaas.post('/customers', {
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      cpfCnpj: tenant.cnpj || tenant.document,
      notificationDisabled: false
    });
    return data;
  },

  /**
   * Cria uma assinatura recorrente no Asaas
   * @param {Object} params
   * @param {string} params.customerId - ID do cliente no Asaas
   * @param {string} params.billingType - 'PIX' | 'BOLETO' | 'CREDIT_CARD'
   * @param {number} params.value - Valor da assinatura
   * @param {string} params.nextDueDate - Próximo vencimento (YYYY-MM-DD)
   * @param {string} params.description - Descrição da assinatura
   * @param {string} params.cycle - 'MONTHLY' | 'YEARLY' | 'WEEKLY'
   * @param {Object} params.metadata - Metadados adicionais
   * @returns {Promise<Object>} Assinatura criada
   */
  async createSubscription({ customerId, billingType, value, nextDueDate, description, cycle = 'MONTHLY', metadata = {} }) {
    const { data } = await asaas.post('/subscriptions', {
      customer: customerId,
      billingType,
      value,
      nextDueDate,
      description,
      cycle,
      maxPayments: null, // Indeterminado (recorrência contínua)
      externalReference: metadata.tenantId,
      fine: {
        value: 2.0, // 2% de multa
        type: 'PERCENTAGE'
      },
      interest: {
        value: 0.33, // 0.33% ao dia de juros
        type: 'PERCENTAGE'
      },
      discount: {
        value: 0,
        dueDateLimitDays: 0,
        type: 'FIXED'
      }
    });
    return data;
  },

  /**
   * Gera um link de pagamento PIX para fatura avulsa
   * @param {Object} params
   * @returns {Promise<Object>} Dados do PIX gerado
   */
  async generatePixPayment({ customerId, value, description, dueDate }) {
    const { data } = await asaas.post('/payments', {
      customer: customerId,
      billingType: 'PIX',
      value,
      dueDate,
      description
    });
    return data;
  },

  /**
   * Obtém detalhes de uma assinatura
   * @param {string} subscriptionId - ID da assinatura no Asaas
   * @returns {Promise<Object>} Dados da assinatura
   */
  async getSubscription(subscriptionId) {
    const { data } = await asaas.get(`/subscriptions/${subscriptionId}`);
    return data;
  },

  /**
   * Cancela uma assinatura
   * @param {string} subscriptionId - ID da assinatura no Asaas
   * @returns {Promise<Object>} Resultado do cancelamento
   */
  async cancelSubscription(subscriptionId) {
    const { data } = await asaas.delete(`/subscriptions/${subscriptionId}`);
    return data;
  },

  /**
   * Lista cobranças de uma assinatura
   * @param {string} subscriptionId - ID da assinatura
   * @returns {Promise<Array>} Lista de cobranças
   */
  async listPayments(subscriptionId) {
    const { data } = await asaas.get('/payments', {
      params: { subscription: subscriptionId }
    });
    return data.data;
  },

  /**
   * Valida a assinatura do webhook do Asaas
   * O Asaas não envia um header de assinatura como o Stripe.
   * A validação é feita verificando se o IP de origem é do Asaas
   * ou usando um token de acesso enviado no body.
   * 
   * @param {Object} body - Corpo da requisição
   * @returns {boolean} true se válido
   */
  validateWebhook(body) {
    // O Asaas permite configurar um token de segurança no webhook
    // que é enviado no body como 'securityToken'
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
    
    if (!expectedToken) {
      console.warn('[Asaas] Webhook token não configurado. Pulando validação.');
      return true;
    }

    if (body.securityToken !== expectedToken) {
      console.error('[Asaas] Token de segurança inválido no webhook');
      return false;
    }

    return true;
  },

  /**
   * Mapeia o evento do Asaas para o formato interno
   * @param {Object} event - Evento recebido do Asaas
   * @returns {Object} Evento normalizado
   */
  normalizeEvent(event) {
    const payment = event.payment;
    
    const eventMap = {
      'PAYMENT_CREATED': 'payment.created',
      'PAYMENT_AWAITING_RISK_ANALYSIS': 'payment.pending',
      'PAYMENT_APPROVED_BY_RISK_ANALYSIS': 'payment.approved',
      'PAYMENT_REPROVED_BY_RISK_ANALYSIS': 'payment.reproved',
      'PAYMENT_CONFIRMED': 'payment.succeeded',
      'PAYMENT_RECEIVED': 'payment.succeeded',
      'PAYMENT_OVERDUE': 'payment.past_due',
      'PAYMENT_DELETED': 'payment.canceled',
      'PAYMENT_RESTORED': 'payment.restored',
      'PAYMENT_REFUNDED': 'payment.refunded',
      'PAYMENT_CHARGEBACK_REQUESTED': 'payment.chargeback',
      'PAYMENT_CHARGEBACK_DISPUTE': 'payment.chargeback_dispute',
      'PAYMENT_AWAITING_CHARGEBACK_REVERSAL': 'payment.chargeback_reversal',
      'SUBSCRIPTION_CREATED': 'subscription.created',
      'SUBSCRIPTION_UPDATED': 'subscription.updated',
      'SUBSCRIPTION_ACTIVATED': 'subscription.activated',
      'SUBSCRIPTION_SUSPENDED': 'subscription.suspended',
      'SUBSCRIPTION_CANCELED': 'subscription.canceled',
    };

    return {
      type: eventMap[event.event] || event.event,
      originalEvent: event.event,
      subscriptionId: payment?.subscription,
      paymentId: payment?.id,
      customerId: payment?.customer,
      value: payment?.value,
      netValue: payment?.netValue,
      billingType: payment?.billingType,
      status: payment?.status,
      dueDate: payment?.dueDate,
      confirmedDate: payment?.confirmedDate,
      invoiceUrl: payment?.invoiceUrl,
      pixQrCode: payment?.pixQrCode,
      pixKey: payment?.pixKey,
      metadata: payment?.externalReference,
      tenantId: payment?.externalReference
    };
  }
};

module.exports = asaasService;