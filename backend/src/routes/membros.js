const express = require('express');
const router = express.Router();
const membrosController = require('../controllers/membrosController');
const { authenticateToken, authorize } = require('../middleware/auth');

// Listar membros (MANAGER+)
router.get('/', authenticateToken, authorize('member:list'), membrosController.listarMembros);

// Obter membro por ID (MANAGER+)
router.get('/:id', authenticateToken, authorize('member:list'), membrosController.getMembro);

// Criar membro (MANAGER+)
router.post('/', authenticateToken, authorize('member:create'), membrosController.criarMembro);

// Atualizar membro (ADMIN only)
router.put('/:id', authenticateToken, authorize('member:update'), membrosController.atualizarMembro);

// Deletar membro (ADMIN only)
router.delete('/:id', authenticateToken, authorize('member:delete'), membrosController.deletarMembro);

module.exports = router;
