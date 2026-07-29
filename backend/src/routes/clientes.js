const express = require('express');
const router = express.Router();
const clientesController = require('../controllers/clientesController');
const { authenticateToken, authorize } = require('../middleware/auth');

// Listar clientes (MEMBER+)
router.get('/', authenticateToken, authorize('client:list'), clientesController.listarClientes);

// Obter cliente por ID (MEMBER+)
router.get('/:id', authenticateToken, authorize('client:list'), clientesController.getCliente);

// Criar cliente (MANAGER+)
router.post('/', authenticateToken, authorize('client:create'), clientesController.criarCliente);

// Atualizar cliente (MANAGER+)
router.put('/:id', authenticateToken, authorize('client:update'), clientesController.atualizarCliente);

// Deletar cliente (ADMIN only)
router.delete('/:id', authenticateToken, authorize('client:delete'), clientesController.deletarCliente);

module.exports = router;
