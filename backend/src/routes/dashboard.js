const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { authenticateToken, authorize } = require('../middleware/auth');

// Rota protegida - Dados principais do dashboard (MEMBER+)
router.get('/', authenticateToken, authorize('dashboard:view'), dashboardController.getDashboard);

// Rota protegida - Dados para gráficos (MEMBER+)
router.get('/graficos', authenticateToken, authorize('dashboard:view'), dashboardController.getGraficos);

// Rota protegida - Atividades recentes (MEMBER+)
router.get('/atividades', authenticateToken, authorize('dashboard:view'), dashboardController.getAtividadesRecentes);

// Excluir organização (ADMIN only) - LGPD Direito ao Esquecimento
router.delete('/organization', authenticateToken, authorize('tenant:delete'), dashboardController.deletarTenant);

module.exports = router;
