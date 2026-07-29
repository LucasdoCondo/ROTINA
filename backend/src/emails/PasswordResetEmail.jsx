const React = require('react');
const { Body, Container, Head, Heading, Html, Link, Preview, Text, Section } = require('@react-email/components');

/**
 * Template de e-mail de redefinição de senha
 * 
 * Enviado quando o usuário solicita redefinição de senha
 * O link expira em 1 hora por segurança
 */
const PasswordResetEmail = ({
  userName = 'Usuário',
  appName = 'ROTINA',
  appUrl = 'https://app.rotina.com.br',
  resetToken = '',
}) => (
  <Html>
    <Head />
    <Preview>Redefina sua senha no {appName}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={headerStyle}>
          <Heading style={logoText}>{appName}</Heading>
        </Section>

        {/* Content */}
        <Section style={contentStyle}>
          <Heading style={h1}>Redefinição de Senha</Heading>
          
          <Text style={text}>
            Olá <strong>{userName}</strong>,
          </Text>

          <Text style={text}>
            Recebemos uma solicitação para redefinir a senha da sua conta no {appName}.
            Clique no botão abaixo para criar uma nova senha:
          </Text>

          <Section style={centerSection}>
            <Link 
              href={`${appUrl}/resetar-senha?token=${resetToken}`} 
              style={button}
            >
              Redefinir Senha
            </Link>
          </Section>

          <Section style={warningBox}>
            <Text style={warningText}>
              ⚠️ Este link de redefinição expira em <strong>1 hora</strong>.
            </Text>
          </Section>

          <Text style={text}>
            Se você não solicitou esta redefinição, ignore este e-mail. 
            Sua senha atual permanecerá segura e inalterada.
          </Text>

          <Section style={infoBox}>
            <Text style={infoTitle}>Não consegue clicar no botão?</Text>
            <Text style={infoText}>
              Copie e cole o link abaixo no seu navegador:
            </Text>
            <Text style={infoLink}>
              {appUrl}/resetar-senha?token={resetToken}
            </Text>
          </Section>
        </Section>

        {/* Footer */}
        <Section style={footerStyle}>
          <Text style={footer}>
            © {new Date().getFullYear()} {appName}. Todos os direitos reservados.
          </Text>
          <Text style={footer}>
            Se você não solicitou esta alteração, entre em contato com nosso suporte.
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

const warningBox = {
  backgroundColor: '#fffaf0',
  border: '1px solid #fbd38d',
  borderRadius: '6px',
  padding: '12px 16px',
  margin: '20px 0',
};

const warningText = {
  color: '#c05621',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
};

const infoBox = {
  backgroundColor: '#f7fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  padding: '16px',
  margin: '24px 0',
};

const infoTitle = {
  color: '#2d3748',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
};

const infoText = {
  color: '#718096',
  fontSize: '13px',
  margin: '0 0 8px 0',
};

const infoLink = {
  color: '#667eea',
  fontSize: '12px',
  wordBreak: 'break-all' as const,
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

module.exports = PasswordResetEmail;