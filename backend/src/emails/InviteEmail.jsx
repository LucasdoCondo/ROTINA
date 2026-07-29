const React = require('react');
const { Body, Container, Head, Heading, Html, Link, Preview, Text, Section } = require('@react-email/components');

/**
 * Template de e-mail de convite para membro da equipe
 * 
 * Enviado quando um ADMIN/MANAGER convida um novo membro
 * O link expira em 7 dias
 */
const InviteEmail = ({
  invitedByName = 'Administrador',
  tenantName = 'Empresa',
  appName = 'ROTINA',
  appUrl = 'https://app.rotina.com.br',
  inviteToken = '',
}) => (
  <Html>
    <Head />
    <Preview>Você foi convidado para se juntar à equipe {tenantName}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={headerStyle}>
          <Heading style={logoText}>{appName}</Heading>
        </Section>

        {/* Content */}
        <Section style={contentStyle}>
          <Heading style={h1}>Você recebeu um convite! 🎉</Heading>
          
          <Text style={text}>
            <strong>{invitedByName}</strong> convidou você para colaborar na 
            organização <strong>{tenantName}</strong> no {appName}.
          </Text>

          <Text style={text}>
            Com o {appName}, você poderá:
          </Text>

          <FeatureItem text="📋 Gerenciar chamados de suporte" />
          <FeatureItem text="👥 Colaborar com sua equipe" />
          <FeatureItem text="📊 Acompanhar métricas em tempo real" />
          <FeatureItem text="💰 Controlar vendas e clientes" />

          <Section style={centerSection}>
            <Link 
              href={`${appUrl}/aceitar-convite?token=${inviteToken}`} 
              style={button}
            >
              Aceitar Convite
            </Link>
          </Section>

          <Section style={warningBox}>
            <Text style={warningText}>
              ⏰ Este convite expira em <strong>7 dias</strong>.
            </Text>
          </Section>

          <Text style={text}>
            Se você não esperava por este convite, pode ignorar este e-mail com segurança.
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

const FeatureItem = ({ text }) => (
  <Text style={featureItem}>{text}</Text>
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

const featureItem = {
  color: '#444444',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '4px 0',
  paddingLeft: '8px',
};

const centerSection = {
  textAlign: 'center',
  margin: '24px 0',
};

const button = {
  backgroundColor: '#10b981',
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

module.exports = InviteEmail;