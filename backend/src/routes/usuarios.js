const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuariosController');
const { authenticateToken, authorize } = require('../middleware/auth');

// Listar usuários (MANAGER+)
router.get('/', authenticateToken, authorize('user:list'), usuariosController.listarUsuarios);

// Obter usuário por ID (MANAGER+)
router.get('/:id', authenticateToken, authorize('user:list'), usuariosController.getUsuario);

// Criar usuário (MANAGER+)
router.post('/', authenticateToken, authorize('user:invite'), usuariosController.criarUsuario);

// Atualizar usuário (ADMIN only)
router.put('/:id', authenticateToken, authorize('user:update'), usuariosController.atualizarUsuario);

// Deletar usuário (ADMIN only)
router.delete('/:id', authenticateToken, authorize('user:delete'), usuariosController.deletarUsuario);

// Exportar dados do usuário (LGPD - Direito de portabilidade)
router.get('/export', authenticateToken, usuariosController.exportarDadosUsuario);

module.exports = router;
