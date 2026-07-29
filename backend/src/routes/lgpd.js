const express = require('express');
const router = express.Router();
const tenantLGPDController = require('../controllers/tenantLGPDController');
const { authenticateToken, isAdmin } = require('../middleware/auth');

/**
 * @route   GET /api/tenant/export
 * @desc    Exporta todos os dados do tenant (LGPD - Direito de portabilidade)
 * @access  Private (Admin apenas)
 * 
 * Retorna um arquivo JSON com todos os dados da organização,
 * incluindo usuários, clientes, produtos, pedidos, etc.
 */
router.get('/export', authenticateToken, isAdmin, tenantLGPDController.exportarDadosTenant);

/**
 * @route   DELETE /api/tenant/delete
 * @desc    Exclui o tenant e todos os dados em cascata (LGPD - Direito ao esquecimento)
 * @access  Private (Admin apenas)
 * 
 * IMPORTANTE: Esta operação é irreversível!
 * Todos os dados do tenant (usuários, clientes, pedidos, etc.) serão excluídos.
 */
router.delete('/delete', authenticateToken, isAdmin, tenantLGPDController.excluirTenant);

module.exports = router;