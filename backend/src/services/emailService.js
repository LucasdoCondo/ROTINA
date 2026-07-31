/**
 * Serviço de E-mail Transacional
 * 
 * Integra os templates React Email com o Resend para envio de e-mails
 * tipados e responsivos.
 * 
 * Templates disponíveis:
 *   - WelcomeEmail: Boas-vindas + verificação de e-mail
 *   - PasswordResetEmail: Redefinição de senha
 *   - InviteEmail: Convite de membros da equipe
 *   - PaymentFailedEmail: Alerta de falha no pagamento
 *   - InvoiceEmail: Fatura mensal (pendente ou paga)
 * 
 * Boas práticas:
 *   - Chamadas assíncronas (sem await) para não bloquear a UI
 *   - Graceful degradation: se Resend não configurado, apenas loga
 *   - Logs estruturados para rastrear envios
 */

const { resend, SENDER_EMAIL, APP_URL, APP_NAME } = require('../config/resend');

/**
 * Carrega um template de e-mail sob demanda (lazy load)
 * Os templates são arquivos .jsx que só funcionam em ambiente com transpilação.
 * Em produção (Vercel), o build do backend resolve isso.
 * Em desenvolvimento local, retorna null para não travar o servidor.
 */
function loadTemplate(templateName) {
  try {
    return require(`../emails/${templateName}`);
  } catch (err) {
    console.warn(`[Email] Template ${templateName} não disponível em dev. Erro: ${err.message}`);
    return null;
  }
}

const emailService = {
  /**
   * Envia e-mail de boas-vindas com verificação
   * 
   * @param {Object} user - { name, email }
   * @param {string} verificationToken - Token para verificação
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendWelcome(user, verificationToken) {
    if (!resend) {
      console.warn('[Email] Resend não configurado. Boas-vindas não enviadas.');
      return { success: false, reason: 'RESEND_NOT_CONFIGURED' };
    }

    const WelcomeEmail = loadTemplate('WelcomeEmail');
    if (!WelcomeEmail) {
      return { success: false, reason: 'TEMPLATE_NOT_AVAILABLE' };
    }

    try {
      const { data, error } = await resend.emails.send({
        from: SENDER_EMAIL,
        to: [user.email],
        subject: `Bem-vindo ao ${APP_NAME}! Verifique seu e-mail`,
        react: WelcomeEmail({
          userName: user.name,
          appName: APP_NAME,
          appUrl: APP_URL,
          verificationToken,
        }),
      });

      if (error) {
        console.error('[Email] Erro ao enviar boas-vindas:', error);
        return { success: false, error };
      }

      console.log(`[Email] ✅ Boas-vindas enviada para ${user.email}`);
      return { success: true, data };
    } catch (err) {
      console.error('[Email] Falha ao enviar boas-vindas:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Envia e-mail de redefinição de senha
   * 
   * @param {Object} user - { name, email }
   * @param {string} resetToken - Token de reset (expira em 1h)
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendPasswordReset(user, resetToken) {
    if (!resend) {
      console.warn('[Email] Resend não configurado. Reset de senha não enviado.');
      return { success: false, reason: 'RESEND_NOT_CONFIGURED' };
    }

    const PasswordResetEmail = loadTemplate('PasswordResetEmail');
    if (!PasswordResetEmail) {
      return { success: false, reason: 'TEMPLATE_NOT_AVAILABLE' };
    }

    try {
      const { data, error } = await resend.emails.send({
        from: SENDER_EMAIL,
        to: [user.email],
        subject: `Redefinição de Senha - ${APP_NAME}`,
        react: PasswordResetEmail({
          userName: user.name,
          appName: APP_NAME,
          appUrl: APP_URL,
          resetToken,
        }),
      });

      if (error) {
        console.error('[Email] Erro ao enviar reset de senha:', error);
        return { success: false, error };
      }

      console.log(`[Email] ✅ Reset de senha enviado para ${user.email}`);
      return { success: true, data };
    } catch (err) {
      console.error('[Email] Falha ao enviar reset de senha:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Envia convite para membro da equipe
   * 
   * @param {Object} invitedBy - { name, email } (quem convidou)
   * @param {string} inviteeEmail - E-mail de quem foi convidado
   * @param {string} tenantName - Nome da empresa
   * @param {string} inviteToken - Token do convite (expira em 7 dias)
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendMemberInvite(invitedBy, inviteeEmail, tenantName, inviteToken) {
    if (!resend) {
      console.warn('[Email] Resend não configurado. Convite não enviado.');
      return { success: false, reason: 'RESEND_NOT_CONFIGURED' };
    }

    const InviteEmail = loadTemplate('InviteEmail');
    if (!InviteEmail) {
      return { success: false, reason: 'TEMPLATE_NOT_AVAILABLE' };
    }

    try {
      const { data, error } = await resend.emails.send({
        from: SENDER_EMAIL,
        to: [inviteeEmail],
        subject: `${invitedBy.name} convidou você para a equipe ${tenantName}`,
        react: InviteEmail({
          invitedByName: invitedBy.name,
          tenantName,
          appName: APP_NAME,
          appUrl: APP_URL,
          inviteToken,
        }),
      });

      if (error) {
        console.error('[Email] Erro ao enviar convite:', error);
        return { success: false, error };
      }

      console.log(`[Email] ✅ Convite enviado para ${inviteeEmail}`);
      return { success: true, data };
    } catch (err) {
      console.error('[Email] Falha ao enviar convite:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Envia alerta de falha no pagamento
   * 
   * @param {Object} tenant - { name, email }
   * @param {Object} subscription - { planId, value, paymentAttempts, lastInvoiceUrl }
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendPaymentFailed(tenant, subscription) {
    if (!resend) {
      console.warn('[Email] Resend não configurado. Alerta de falha não enviado.');
      return { success: false, reason: 'RESEND_NOT_CONFIGURED' };
    }

    const PaymentFailedEmail = loadTemplate('PaymentFailedEmail');
    if (!PaymentFailedEmail) {
      return { success: false, reason: 'TEMPLATE_NOT_AVAILABLE' };
    }

    try {
      const { data, error } = await resend.emails.send({
        from: SENDER_EMAIL,
        to: [tenant.email],
        subject: `⚠️ Pagamento não aprovado - ${APP_NAME}`,
        react: PaymentFailedEmail({
          tenantName: tenant.name,
          appName: APP_NAME,
          appUrl: APP_URL,
          planName: subscription.planId,
          amount: subscription.value,
          dueDate: subscription.dueDate || new Date().toLocaleDateString('pt-BR'),
          invoiceUrl: subscription.lastInvoiceUrl,
          paymentAttempts: subscription.paymentAttempts,
        }),
      });

      if (error) {
        console.error('[Email] Erro ao enviar alerta de falha:', error);
        return { success: false, error };
      }

      console.log(`[Email] ✅ Alerta de falha enviado para ${tenant.email}`);
      return { success: true, data };
    } catch (err) {
      console.error('[Email] Falha ao enviar alerta de falha:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Envia fatura mensal
   * 
   * @param {Object} tenant - { name, email }
   * @param {Object} invoice - { id, planName, amount, dueDate, status, invoiceUrl, billingType }
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendInvoice(tenant, invoice) {
    if (!resend) {
      console.warn('[Email] Resend não configurado. Fatura não enviada.');
      return { success: false, reason: 'RESEND_NOT_CONFIGURED' };
    }

    const InvoiceEmail = loadTemplate('InvoiceEmail');
    if (!InvoiceEmail) {
      return { success: false, reason: 'TEMPLATE_NOT_AVAILABLE' };
    }

    try {
      const isPaid = invoice.status === 'paid' || invoice.status === 'RECEIVED';
      
      const { data, error } = await resend.emails.send({
        from: SENDER_EMAIL,
        to: [tenant.email],
        subject: `Fatura #${invoice.id} - ${APP_NAME}`,
        react: InvoiceEmail({
          tenantName: tenant.name,
          appName: APP_NAME,
          appUrl: APP_URL,
          invoiceId: invoice.id,
          planName: invoice.planName,
          amount: invoice.amount,
          dueDate: invoice.dueDate,
          status: isPaid ? 'paid' : 'pending',
          invoiceUrl: invoice.invoiceUrl,
          billingType: invoice.billingType || 'PIX',
        }),
      });

      if (error) {
        console.error('[Email] Erro ao enviar fatura:', error);
        return { success: false, error };
      }

      console.log(`[Email] ✅ Fatura enviada para ${tenant.email}`);
      return { success: true, data };
    } catch (err) {
      console.error('[Email] Falha ao enviar fatura:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Envia e-mail genérico (para casos não cobertos pelos templates)
   * 
   * @param {string} to - E-mail do destinatário
   * @param {string} subject - Assunto
   * @param {string} html - Conteúdo HTML
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendGeneric(to, subject, html) {
    if (!resend) {
      console.warn('[Email] Resend não configurado. E-mail não enviado.');
      return { success: false, reason: 'RESEND_NOT_CONFIGURED' };
    }

    try {
      const { data, error } = await resend.emails.send({
        from: SENDER_EMAIL,
        to: [to],
        subject,
        html,
      });

      if (error) {
        console.error('[Email] Erro ao enviar e-mail:', error);
        return { success: false, error };
      }

      console.log(`[Email] ✅ E-mail enviado para ${to}`);
      return { success: true, data };
    } catch (err) {
      console.error('[Email] Falha ao enviar e-mail:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Envia e-mail de teste para validação do domínio Resend
   * 
   * @param {string} email - E-mail do destinatário
   * @param {string} [name] - Nome do destinatário (opcional)
   * @returns {Promise<Object>} Resultado do envio
   */
  async sendTest(email, name) {
    if (!resend) {
      console.warn('[Email] Resend não configurado. E-mail de teste não enviado.');
      return { success: false, reason: 'RESEND_NOT_CONFIGURED' };
    }

    const WelcomeEmail = loadTemplate('WelcomeEmail');
    if (!WelcomeEmail) {
      return { success: false, reason: 'TEMPLATE_NOT_AVAILABLE' };
    }

    try {
      const { data, error } = await resend.emails.send({
        from: SENDER_EMAIL,
        to: [email],
        subject: `Teste de Envio - Validação do Domínio Resend`,
        react: WelcomeEmail({
          userName: name || 'Usuário de Teste',
          appName: APP_NAME,
          appUrl: APP_URL,
          verificationToken: 'test-token',
        }),
      });

      if (error) {
        console.error('[Email] Erro ao enviar e-mail de teste:', error);
        return { success: false, error };
      }

      console.log(`[Email] ✅ E-mail de teste enviado para ${email}`);
      return { success: true, data };
    } catch (err) {
      console.error('[Email] Falha ao enviar e-mail de teste:', err);
      return { success: false, error: err.message };
    }
  },
};

module.exports = emailService;