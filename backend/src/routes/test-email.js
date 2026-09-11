const express = require('express');
const router = express.Router();
const testEmailController = require('../controllers/testEmailController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { withErrorHandling } = require('../middleware/apiHandler');

/**
 * @route   POST /api/test-email
 * @desc    Envia e-mail de teste para validação do domínio Resend
 * @access  ADMIN apenas (settings:manage)
 *
 * 🔐 SEGURANÇA: rota anteriormente PÚBLICA permitia que qualquer pessoa
 * usasse o Resend da plataforma para envio de e-mails em massa
 * (spam/phishing + queima de reputação do domínio). Agora exige
 * autenticação e permissão de administração.
 */
router.post(
  '/',
  authenticateToken,
  authorize('settings:manage'),
  withErrorHandling(testEmailController.sendTest)
);

module.exports = router;