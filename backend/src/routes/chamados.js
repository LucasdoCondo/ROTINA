const express = require('express');
const router = express.Router();
const chamadosController = require('../controllers/chamadosController');
const { authenticateToken, authorize } = require('../middleware/auth');

// Listar chamados (MEMBER+)
router.get('/', authenticateToken, authorize('ticket:list'), chamadosController.listarChamados);

// Obter chamado por ID (MEMBER+)
router.get('/:id', authenticateToken, authorize('ticket:list'), chamadosController.getChamado);

// Criar chamado (MEMBER+)
router.post('/', authenticateToken, authorize('ticket:create'), chamadosController.criarChamado);

// Atualizar chamado (MANAGER+)
router.put('/:id', authenticateToken, authorize('ticket:update'), chamadosController.atualizarChamado);

// Deletar chamado (ADMIN only)
router.delete('/:id', authenticateToken, authorize('ticket:delete'), chamadosController.deletarChamado);

module.exports = router;
