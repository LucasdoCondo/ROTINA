const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');
const { authenticateToken, authorize } = require('../middleware/auth');

// Listar pedidos (MEMBER+)
router.get('/', authenticateToken, authorize('order:list'), pedidosController.listarPedidos);

// Obter pedido por ID (MEMBER+)
router.get('/:id', authenticateToken, authorize('order:list'), pedidosController.getPedido);

// Criar pedido (MANAGER+)
router.post('/', authenticateToken, authorize('order:create'), pedidosController.criarPedido);

// Atualizar pedido (MANAGER+)
router.put('/:id', authenticateToken, authorize('order:update'), pedidosController.atualizarStatusPedido);

// Deletar pedido (ADMIN only)
router.delete('/:id', authenticateToken, authorize('order:delete'), pedidosController.deletarPedido);

module.exports = router;
