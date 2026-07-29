const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { authenticateToken, authorize } = require('../middleware/auth');

// ═══════════════════════════════════════════════
// Rotas de Auditoria
// ═══════════════════════════════════════════════
// Acesso restrito a ADMIN e MANAGER (settings:view)

// Estatísticas (deve vir antes de /:id para não conflitar)
router.get('/estatisticas', authenticateToken, authorize('settings:view'), auditController.estatisticas);

// Retenção: remover logs antigos (somente ADMIN)
router.delete('/retention', authenticateToken, authorize('settings:manage'), auditController.purgeOldLogs);

// Listar logs com filtros e paginação
router.get('/', authenticateToken, authorize('settings:view'), auditController.listarLogs);

// Obter log específico por ID
router.get('/:id', authenticateToken, authorize('settings:view'), auditController.getLog);

module.exports = router;
