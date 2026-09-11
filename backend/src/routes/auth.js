const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { withErrorHandling } = require('../middleware/apiHandler');

// Rota pública - Registrar tenant
router.post('/registrar', withErrorHandling(authController.registrarTenant));

// Rota pública - Login
router.post('/login', withErrorHandling(authController.login));

// Rota protegida - Logout
router.post('/logout', authenticateToken, withErrorHandling(authController.logout));

// Rota protegida - Perfil do usuário
router.get('/perfil', authenticateToken, withErrorHandling(authController.perfil));

// Rota protegida - Atualizar perfil
router.put('/perfil', authenticateToken, withErrorHandling(authController.atualizarPerfil));

// Rota pública - Verificar e-mail (link do WelcomeEmail.jsx)
router.get('/verificar-email', withErrorHandling(authController.verificarEmail));

// Rota pública - Aceitar convite de membro (link do InviteEmail.jsx)
router.post('/aceitar-convite', withErrorHandling(authController.aceitarConvite));

module.exports = router;
