const emailService = require('../services/emailService');

const testEmailController = {
  async sendTest(req, res) {
    try {
      const { email, name } = req.body;

      if (!email) {
        return res.status(400).json({
          message: 'O e-mail de destino é obrigatório.',
          code: 'MISSING_EMAIL',
        });
      }

      const result = await emailService.sendTest(email, name);

      if (!result.success) {
        const statusCode = result.reason === 'RESEND_NOT_CONFIGURED' ? 503 : 400;
        return res.status(statusCode).json({
          message: 'Falha ao enviar e-mail de teste',
          ...result,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'E-mail de teste enviado com sucesso!',
        data: result.data,
      });
    } catch (error) {
      console.error('Erro no controller de teste de e-mail:', error);
      return res.status(500).json({
        message: 'Erro interno no servidor ao tentar enviar o e-mail.',
        code: 'INTERNAL_ERROR',
      });
    }
  },
};

module.exports = testEmailController;