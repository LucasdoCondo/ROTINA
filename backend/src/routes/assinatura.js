const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticateToken, authorize } = require('../middleware/auth');

// ═══════════════════════════════════════════════
// Planos e Assinatura
// ═══════════════════════════════════════════════

// Listar planos disponíveis (público - usado na página de preços)
router.get('/planos', subscriptionController.listarPlanos);

// Criar checkout para assinar um plano (autenticado)
router.post('/checkout', authenticateToken, subscriptionController.criarCheckout);

// Verificar minha assinatura atual (autenticado)
router.get('/minha-assinatura', authenticateToken, subscriptionController.minhaAssinatura);

// Histórico de pagamentos (autenticado)
router.get('/historico', authenticateToken, subscriptionController.historicoPagamentos);

// Cancelar assinatura (apenas ADMIN)
router.post('/cancelar', authenticateToken, authorize('billing:manage'), subscriptionController.cancelarAssinatura);

module.exports = router;