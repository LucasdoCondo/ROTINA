const React = require('react');
const { Body, Container, Head, Heading, Html, Link, Preview, Text, Section, Hr } = require('@react-email/components');

/**
 * Template de e-mail de fatura mensal
 * 
 * Enviado quando uma nova cobrança é gerada (PAYMENT_CREATED)
 * ou quando o pagamento é confirmado (PAYMENT_RECEIVED)
 */
const InvoiceEmail = ({
  tenantName = 'Empresa',
  appName = 'ROTINA',
  appUrl = 'https://app.rotina.com.br',
  invoiceId = '',
  planName = 'Profissional',
  amount = '99.90',
  dueDate = '',
  status = 'pending', // 'pending' | 'paid'
  invoiceUrl = '',
  billingType = 'PIX', // 'PIX' | 'BOLETO' | 'CREDIT_CARD'
}) => {
  const isPaid = status === 'paid';
  const statusLabel = isPaid ? '✅ Paga' : '⏳ Pendente';
  const statusColor = isPaid ? '#38a169' : '#d69e2e';
  const statusBg = isPaid ? '#f0fff4' : '#fffbeb';
  const statusBorder = isPaid ? '#9ae6b4' : '#fbd38d';

  return (
    <Html>
      <Head />
      <Preview>Fatura #{invoiceId} - {appName}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={headerStyle}>
            <Heading style={logoText}>{appName}</Heading>
          </Section>

          {/* Content */}
          <Section style={contentStyle}>
            <Heading style={h1}>Fatura Mensal</Heading>
            
            <Text style={text}>
              Olá <strong>{tenantName}</strong>,
            </Text>

            <Text style={text}>
              {isPaid
                ? 'Seu pagamento foi confirmado com sucesso! Aqui estão os detalhes da sua fatura:'
                : 'Uma nova fatura foi gerada para sua assinatura. Confira os detalhes abaixo:'}
            </Text>

            {/* Status badge */}
            <Section style={{ ...statusBox, backgroundColor: statusBg, border: `1px solid ${statusBorder}` }}>
              <Text style={{ ...statusText, color: statusColor }}>
                Status: <strong>{statusLabel}</strong>
              </Text>
            </Section>

            {/* Detalhes da fatura */}
            <Section style={invoiceBox}>
              <Text style={invoiceTitle}>📄 Fatura #{invoiceId}</Text>
              <Hr style={divider} />
              <Text style={detailRow}>
                <span style={detailLabel}>Plano:</span> {planName}
              </Text>
              <Text style={detailRow}>
                <span style={detailLabel}>Valor:</span> R$ {amount}
              </Text>
              <Text style={detailRow}>
                <span style={detailLabel}>Forma de pagamento:</span> {billingType}
              </Text>
              <Text style={detailRow}>
                <span style={detailLabel}>Vencimento:</span> {dueDate}
              </Text>
            </Section>

            {!isPaid && (
              <>
                <Section style={centerSection}>
                  <Link href={invoiceUrl || `${appUrl}/billing/upgrade`} style={button}>
                    Pagar Fatura
                  </Link>
                </Section>

                <Section style={infoBox}>
                  <Text style={infoTitle}>💡 Como pagar:</Text>
                  {billingType === 'PIX' && (
                    <Text style={infoText}>
                      • PIX: Aprovação imediata após o pagamento
                    </Text>
                  )}
                  {billingType === 'BOLETO' && (
                    <Text style={infoText}>
                      • Boleto: Confirmação em até 48 horas úteis
                    </Text>
                  )}
                  {billingType === 'CREDIT_CARD' && (
                    <Text style={infoText}>
                      • Cartão: Aprovação automática
                    </Text>
                  )}
                </Section>
              </>
            )}

            {isPaid && (
              <Section style={successBox}>
                <Text style={successText}>
                  ✅ Pagamento confirmado! Seu acesso está garantido até o próximo vencimento.
                </Text>
              </Section>
            )}

            <Text style={text}>
              Você pode acompanhar todas as suas faturas e o histórico de pagamentos 
              no painel do {appName}.
            </Text>

            <Section style={centerSection}>
              <Link href={`${appUrl}/assinatura/historico`} style={buttonSecondary}>
                Ver Histórico de Pagamentos
              </Link>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footerStyle}>
            <Text style={footer}>
              © {new Date().getFullYear()} {appName}. Todos os direitos reservados.
            </Text>
            <Text style={footer}>
              Dúvidas? Responda a este e-mail ou acesse nosso suporte.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

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
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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

const h1 = {
  color: '#1a1a1a',
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

const statusBox = {
  borderRadius: '6px',
  padding: '12px 16px',
  margin: '20px 0',
  textAlign: 'center',
};

const statusText = {
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0',
};

const invoiceBox = {
  backgroundColor: '#f7fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  padding: '20px',
  margin: '20px 0',
};

const invoiceTitle = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
};

const divider = {
  borderColor: '#e2e8f0',
  margin: '0 0 12px 0',
};

const detailRow = {
  color: '#2d3748',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '6px 0',
};

const detailLabel = {
  color: '#718096',
  fontWeight: 'bold',
  display: 'inline-block',
  width: '160px',
};

const centerSection = {
  textAlign: 'center',
  margin: '24px 0',
};

const button = {
  backgroundColor: '#667eea',
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

const infoBox = {
  backgroundColor: '#ebf8ff',
  border: '1px solid #bee3f8',
  borderRadius: '6px',
  padding: '16px',
  margin: '20px 0',
};

const infoTitle = {
  color: '#2b6cb0',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
};

const infoText = {
  color: '#2c5282',
  fontSize: '13px',
  lineHeight: '20px',
  margin: '4px 0',
};

const successBox = {
  backgroundColor: '#f0fff4',
  border: '1px solid #9ae6b4',
  borderRadius: '6px',
  padding: '12px 16px',
  margin: '20px 0',
};

const successText = {
  color: '#276749',
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

module.exports = InvoiceEmail;