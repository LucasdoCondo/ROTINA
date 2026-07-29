const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// ═══════════════════════════════════════════════
// Webhooks de Pagamento
// ═══════════════════════════════════════════════
// 
// IMPORTANTE: Webhooks NÃO usam authenticateToken
// porque são chamados pelos gateways (Asaas/Stripe),
// não por usuários autenticados.
//
// A validação é feita por:
// - Asaas: securityToken no body
// - Stripe: stripe-signature header
//
// O body deve ser recebido como RAW (text) para
// validação da assinatura digital.
// ═══════════════════════════════════════════════

// Webhook do Asaas (requer body como raw text para validação)
router.post('/asaas', express.raw({ type: 'application/json' }), webhookController.asaasWebhook);

// Webhook do Stripe (requer body como raw text para validação da assinatura)
router.post('/stripe', express.raw({ type: 'application/json' }), webhookController.stripeWebhook);

// ═══════════════════════════════════════════════
// Status da Assinatura (protegido)
// ═══════════════════════════════════════════════
const { authenticateToken } = require('../middleware/auth');

// Verificar status da assinatura do tenant logado
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const { subscriptionService } = require('../services/subscriptionService');
    const status = await subscriptionService.checkAccess(req.tenantId);
    return res.json(status);
  } catch (error) {
    console.error('[Webhook] Erro ao verificar status:', error);
    return res.status(500).json({ error: 'Erro ao verificar status da assinatura' });
  }
});

module.exports = router;