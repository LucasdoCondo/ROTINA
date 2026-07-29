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
    try {
      // 1. Validar que a requisição veio do Asaas (segurança)
      if (!asaasService.validateWebhook(req.body)) {
        console.error('[Webhook] Tentativa de webhook inválido');
        return res.status(401).json({
          error: 'Invalid webhook signature'
        });
      }

      // 2. Normalizar o evento para formato interno
      const event = asaasService.normalizeEvent(req.body);
      
      console.log('[Webhook] Evento recebido:', {
        type: event.type,
        originalEvent: event.originalEvent,
        subscriptionId: event.subscriptionId,
        tenantId: event.tenantId,
        value: event.value
      });

      // 3. Processar o evento (atualizar banco, etc)
      const result = await subscriptionService.processWebhookEvent(event);

      // 4. Sempre retornar 200 para o gateway (evita reenvio)
      return res.status(200).json({
        received: true,
        ...result
      });

    } catch (error) {
      console.error('[Webhook] Erro ao processar evento:', error);
      
      // Mesmo em erro, retornar 200 para não reenviar
      return res.status(200).json({
        received: true,
        error: error.message
      });
    }
  },

  /**
   * Endpoint de webhook do Stripe (para compatibilidade futura)
   * 
   * URL: POST /api/webhooks/stripe
   */
  async stripeWebhook(req, res) {
    try {
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

      // Por enquanto, apenas logar o evento
      console.log('[Stripe Webhook] Evento recebido:', req.body.type);

      return res.status(200).json({ received: true });

    } catch (error) {
      console.error('[Stripe Webhook] Erro:', error);
      return res.status(400).json({ error: error.message });
    }
  },

  /**
   * Endpoint para verificar status da assinatura (usado pelo frontend)
   * 
   * URL: GET /api/webhooks/status/:tenantId
   */
  async checkSubscriptionStatus(req, res) {
    try {
      const { tenantId } = req.params;
      
      const status = await subscriptionService.checkAccess(tenantId);
      
      return res.json(status);

    } catch (error) {
      console.error('[Webhook] Erro ao verificar status:', error);
      return res.status(500).json({
        error: 'Erro ao verificar status da assinatura'
      });
    }
  }
};

module.exports = webhookController;