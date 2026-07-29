const express = require('express');
const router = express.Router();
const produtosController = require('../controllers/produtosController');
const { authenticateToken, authorize } = require('../middleware/auth');

// Listar produtos (MEMBER+)
router.get('/', authenticateToken, authorize('product:list'), produtosController.listarProdutos);

// Obter produto por ID (MEMBER+)
router.get('/:id', authenticateToken, authorize('product:list'), produtosController.getProduto);

// Criar produto (MANAGER+)
router.post('/', authenticateToken, authorize('product:create'), produtosController.criarProduto);

// Atualizar produto (MANAGER+)
router.put('/:id', authenticateToken, authorize('product:update'), produtosController.atualizarProduto);

// Deletar produto (ADMIN only)
router.delete('/:id', authenticateToken, authorize('product:delete'), produtosController.deletarProduto);

module.exports = router;
