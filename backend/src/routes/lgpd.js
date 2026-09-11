const express = require('express');
const router = express.Router();
const tenantLGPDController = require('../controllers/tenantLGPDController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { withErrorHandling } = require('../middleware/apiHandler');

/**
 * @route   GET /api/tenant/export
 * @desc    Exporta todos os dados do tenant (LGPD - Direito de portabilidade)
 * @access  Private (ADMIN apenas — authorize('tenant:export'))
 *
 * Retorna um arquivo JSON com todos os dados da organização,
 * incluindo usuários, clientes, produtos, pedidos, etc.
 */
router.get('/export', authenticateToken, authorize('tenant:export'), withErrorHandling(tenantLGPDController.exportarDadosTenant));

/**
 * @route   DELETE /api/tenant/delete
 * @desc    Exclui o tenant e todos os dados em cascata (LGPD - Direito ao esquecimento)
 * @access  Private (ADMIN apenas — authorize('tenant:delete'))
 *
 * IMPORTANTE: Esta operação é irreversível!
 * Todos os dados do tenant (usuários, clientes, pedidos, etc.) serão excluídos.
 * Um registro ANÔNIMO é persistido na tabela DataDeletionLog para compliance.
 */
router.delete('/delete', authenticateToken, authorize('tenant:delete'), withErrorHandling(tenantLGPDController.excluirTenant));

module.exports = router;