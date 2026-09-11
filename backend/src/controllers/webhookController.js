/**
 * Controller de Webhooks - Processa eventos de pagamento dos gateways
 * 
 * Regra de ouro: NUNCA confie no retorno síncrono do frontend
 * para liberar acesso. O status REAL da assinatura é confirmado
 * ASSINCRONAMENTE via Webhook enviado pelo gateway.
 * 
 * Fluxo completo:
 * 1. Usuário seleciona o plano no frontend
 * 2. Backend chama o gateway para criar Sessão de Checkout
 * 3. Usuário paga (Cartão, PIX ou Boleto) na tela do gateway
 * 4. Gateway avisa a API enviando um evento via Webhook
 * 5. API valida a assinatura digital da requisição
 * 6. API atualiza o banco de dados (SubscriptionStatus.ACTIVE)
 */

const asaasService = require('../services/asaasService');
const { subscriptionService } = require('../services/subscriptionService');
const { logger } = require('../config/logger');

/**
 * Convierte el body raw (Buffer) del webhook a objeto JSON.
 * La ruta usa express.raw() para conservar la firma original
 * en la validación del gateway.
 *
 * @param {*} body - req.body (Buffer, string ou objeto)
 * @returns {Object} Body parseado como JSON
 */
function parseWebhookBody(body) {
  if (Buffer.isBuffer(body)) {
    return JSON.parse(body.toString('utf8'));
  }
  if (typeof body === 'string' && body.length > 0) {
    return JSON.parse(body);
  }
  return body || {};
}

const webhookController = {
  /**
   * Endpoint de webhook do Asaas
   * 
   * URL: POST /api/webhooks/asaas
   * 
   * Eventos tratados:
   * - PAYMENT_CONFIRMED / PAYMENT_RECEIVED → Ativa assinatura
   * - PAYMENT_OVERDUE → Marca como PAST_DUE
   * - SUBSCRIPTION_CANCELED → Cancela e bloqueia acesso
   * - SUBSCRIPTION_SUSPENDED → Suspende por inadimplência
   * - PAYMENT_REFUNDED / PAYMENT_CHARGEBACK_REQUESTED → Reembolso
   */
  async asaasWebhook(req, res) {
    const body = parseWebhookBody(req.body);

    // 1. Validar que la requisição venga del Asaas (seguridad)
    if (!asaasService.validateWebhook(body)) {
      logger.warn('[Webhook] Tentativa de webhook inválido');
      return res.status(401).json({
        error: 'Invalid webhook signature'
      });
    }

    // 2. Normalizar o evento para formato interno
    const event = asaasService.normalizeEvent(body);

    logger.info(
      {
        type: event.type,
        originalEvent: event.originalEvent,
        subscriptionId: event.subscriptionId,
        tenantId: event.tenantId,
        value: event.value,
      },
      '[Webhook] Evento recebido'
    );

    // 3. Processar o evento (banco, e-mails, audit logs)
    const result = await subscriptionService.processWebhookEvent(event);

    // 4. Sempre retornar 200 para el gateway (evita reenvíos)
    return res.status(200).json({
      received: true,
      ...result
    });
  },

  /**
   * Endpoint de webhook do Stripe (para compatibilidade futura)
   * 
   * URL: POST /api/webhooks/stripe
   */
  async stripeWebhook(req, res) {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(401).json({ error: 'Missing stripe-signature header' });
    }

    // Validação da assinatura digital do Stripe
    // const event = stripe.webhooks.constructEvent(
    //   req.body,
    //   signature,
    //   process.env.STRIPE_WEBHOOK_SECRET
    // );

    // Por enquanto, solo registrar el evento
    logger.info({ stripeType: req.body?.type }, '[Stripe Webhook] Evento recebido');

    return res.status(200).json({ received: true });
  },

  /**
   * Endpoint para verificar status da assinatura del tenant logado.
   *
   * URL: GET /api/webhooks/status
   *
   * SEGURIDAD: el tenantId NUNCA viene de params/query/body.
   * Siempre se deriva de req.tenantId (JWT via authenticateToken).
   */
  async checkSubscriptionStatus(req, res) {
    const status = await subscriptionService.checkAccess(req.tenantId);
    return res.json(status);
  }
};

module.exports = webhookController;