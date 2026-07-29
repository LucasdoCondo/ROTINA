const express = require('express');
const router = express.Router();
const testEmailController = require('../controllers/testEmailController');

/**
 * @route   POST /api/test-email
 * @desc    Envia e-mail de teste para validação do domínio Resend
 * @access  Public (sem autenticação)
 */
router.post('/', testEmailController.sendTest);

module.exports = router;