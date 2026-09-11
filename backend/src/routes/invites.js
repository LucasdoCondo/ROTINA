const express = require('express');
const router = express.Router();
const inviteController = require('../controllers/inviteController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { withErrorHandling } = require('../middleware/apiHandler');

// Listar convites pendientes (MANAGER+)
router.get('/', authenticateToken, authorize('user:list'), withErrorHandling(inviteController.listar));

// Convidar membro da equipe (MANAGER+ — user:invite)
router.post('/', authenticateToken, authorize('user:invite'), withErrorHandling(inviteController.convidar));

// Revocar convite (ADMIN only)
router.delete('/:id', authenticateToken, authorize('user:delete'), withErrorHandling(inviteController.revocar));

module.exports = router;