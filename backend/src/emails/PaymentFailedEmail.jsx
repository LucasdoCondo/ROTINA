const React = require('react');
const { Body, Container, Head, Heading, Html, Link, Preview, Text, Section } = require('@react-email/components');

/**
 * Template de e-mail de alerta de falha no pagamento
 * 
 * Enviado quando o webhook do Asaas notifica PAYMENT_OVERDUE
 * Inclui link para regularizar e aviso de bloqueio em 5 dias
 */
const PaymentFailedEmail = ({
  tenantName = 'Empresa',
  appName = 'ROTINA',
  appUrl = 'https://app.rotina.com.br',
  planName = 'Profissional',
  amount = '99.90',
  dueDate = '',
  invoiceUrl = '',
  paymentAttempts = 1,
}) => (
  <Html>
    <Head />
    <Preview>⚠️ Pagamento não aprovado - {appName}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={headerStyle}>
          <Heading style={logoText}>{appName}</Heading>
        </Section>

        {/* Content */}
        <Section style={contentStyle}>
          <Heading style={h1Error}>⚠️ Pagamento não aprovado</Heading>
          
          <Text style={text}>
            Olá <strong>{tenantName}</strong>,
          </Text>

          <Text style={text}>
            Não foi possível processar o pagamento da sua assinatura no {appName}.
            Abaixo estão os detalhes:
          </Text>

          {/* Detalhes do pagamento */}
          <Section style={detailsBox}>
            <Text style={detailRow}>
              <strong>Plano:</strong> {planName}
            </Text>
            <Text style={detailRow}>
              <strong>Valor:</strong> R$ {amount}
            </Text>
            <Text style={detailRow}>
              <strong>Vencimento:</strong> {dueDate}
            </Text>
            <Text style={detailRow}>
              <strong>Tentativas:</strong> {paymentAttempts}
            </Text>
          </Section>

          <Section style={centerSection}>
            <Link href={`${appUrl}/billing/upgrade?reason=past_due`} style={button}>
              Regularizar Pagamento
            </Link>
          </Section>

          {invoiceUrl && (
            <Section style={centerSection}>
              <Link href={invoiceUrl} style={buttonSecondary}>
                Ver Fatura
              </Link>
            </Section>
          )}

          {/* Aviso de bloqueio */}
          <Section style={warningBox}>
            <Text style={warningText}>
              🚫 Seu acesso será <strong>bloqueado em 5 dias</strong> caso o 
              pagamento não seja regularizado.
            </Text>
          </Section>

          <Text style={text}>
            Para evitar interrupções no serviço, regularize o pagamento o mais 
            rápido possível. Você pode pagar via PIX, Boleto ou Cartão de Crédito.
          </Text>

          <Text style={text}>
            Precisa de ajuda? Entre em contato com nosso suporte respondendo a 
            este e-mail.
          </Text>
        </Section>

        {/* Footer */}
        <Section style={footerStyle}>
          <Text style={footer}>
            © {new Date().getFullYear()} {appName}. Todos os direitos reservados.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// Estilos
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  padding: '20px 0',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  borderRadius: '8px',
  maxWidth: '600px',
};

const headerStyle = {
  background: '#e53e3e',
  padding: '40px 20px',
  textAlign: 'center',
  borderRadius: '8px 8px 0 0',
};

const logoText = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
};

const contentStyle = {
  padding: '40px 30px',
};

const h1Error = {
  color: '#e53e3e',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
};

const text = {
  color: '#444444',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 16px 0',
};

const detailsBox = {
  backgroundColor: '#f7fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  padding: '16px',
  margin: '20px 0',
};

const detailRow = {
  color: '#2d3748',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '4px 0',
};

const centerSection = {
  textAlign: 'center',
  margin: '20px 0',
};

const button = {
  backgroundColor: '#e53e3e',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  padding: '14px 28px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '16px',
};

const buttonSecondary = {
  backgroundColor: '#718096',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  padding: '12px 24px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '14px',
};

const warningBox = {
  backgroundColor: '#fff5f5',
  border: '1px solid #feb2b2',
  borderRadius: '6px',
  padding: '12px 16px',
  margin: '20px 0',
};

const warningText = {
  color: '#c53030',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const footerStyle = {
  borderTop: '1px solid #e8e8e8',
  padding: '20px 30px',
  textAlign: 'center',
};

const footer = {
  color: '#888888',
  fontSize: '12px',
  lineHeight: '18px',
  margin: '4px 0',
};

module.exports = PaymentFailedEmail;