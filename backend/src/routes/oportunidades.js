const express = require('express');
const router = express.Router();
const oportunidadesController = require('../controllers/oportunidadesController');
const { authenticateToken, authorize } = require('../middleware/auth');

// Listar oportunidades (MEMBER+)
router.get('/', authenticateToken, authorize('opportunity:list'), oportunidadesController.listarOportunidades);

// Obter oportunidade por ID (MEMBER+)
router.get('/:id', authenticateToken, authorize('opportunity:list'), oportunidadesController.getOportunidade);

// Criar oportunidade (MEMBER+)
router.post('/', authenticateToken, authorize('opportunity:create'), oportunidadesController.criarOportunidade);

// Atualizar oportunidade (MANAGER+)
router.put('/:id', authenticateToken, authorize('opportunity:update'), oportunidadesController.atualizarOportunidade);

// Deletar oportunidade (ADMIN only)
router.delete('/:id', authenticateToken, authorize('opportunity:delete'), oportunidadesController.deletarOportunidade);

module.exports = router;
