/**
 * Cliente Resend centralizado
 * 
 * Instancia o SDK do Resend de forma única para toda a aplicação.
 * Em desenvolvimento, usa o e-mail de teste onboarding@resend.dev
 * que só envia para o e-mail cadastrado na conta.
 * 
 * Em produção, usa o domínio próprio verificado (noreply@rotina.com.br)
 */

const { Resend } = require('resend');

// Instanciar cliente apenas se a API key estiver configurada
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// E-mail remetente
// Dev: onboarding@resend.dev (só envia para o e-mail cadastrado)
// Prod: noreply@rotina.com.br (domínio verificado)
const SENDER_EMAIL = process.env.EMAIL_FROM || 'ROTINA <onboarding@resend.dev>';

// URL da aplicação (para links nos e-mails)
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Nome do app
const APP_NAME = process.env.APP_NAME || 'ROTINA';

if (!resend) {
  console.warn('[Resend] API key não configurada. E-mails não serão enviados.');
  console.warn('[Resend] Configure RESEND_API_KEY no .env para habilitar envio.');
}

module.exports = {
  resend,
  SENDER_EMAIL,
  APP_URL,
  APP_NAME,
};