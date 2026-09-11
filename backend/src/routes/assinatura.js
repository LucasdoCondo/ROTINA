const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { withErrorHandling } = require('../middleware/apiHandler');

// ═══════════════════════════════════════════════
// Planos e Assinatura
// ═══════════════════════════════════════════════

// Listar planos disponíveis (público - usado na página de preços)
router.get('/planos', withErrorHandling(subscriptionController.listarPlanos));

// Criar checkout para assinar um plano (autenticado)
router.post('/checkout', authenticateToken, withErrorHandling(subscriptionController.criarCheckout));

// Verificar minha assinatura atual (autenticado)
router.get('/minha-assinatura', authenticateToken, withErrorHandling(subscriptionController.minhaAssinatura));

// Histórico de pagamentos (autenticado)
router.get('/historico', authenticateToken, withErrorHandling(subscriptionController.historicoPagamentos));

// Cancelar assinatura (apenas ADMIN)
router.post('/cancelar', authenticateToken, authorize('billing:manage'), withErrorHandling(subscriptionController.cancelarAssinatura));

module.exports = router;