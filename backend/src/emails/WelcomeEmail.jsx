const React = require('react');
const { Body, Container, Head, Heading, Html, Link, Preview, Text, Section, Img } = require('@react-email/components');

/**
 * Template de e-mail de boas-vindas
 * 
 * Enviado automaticamente após o registro do usuário
 * Inclui link de verificação de e-mail e CTA para acessar o painel
 */
const WelcomeEmail = ({
  userName = 'Usuário',
  appName = 'ROTINA',
  appUrl = 'https://app.rotina.com.br',
  verificationToken = '',
}) => (
  <Html>
    <Head />
    <Preview>Bem-vindo ao {appName}!</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={headerStyle}>
          <Heading style={logoText}>{appName}</Heading>
        </Section>

        {/* Content */}
        <Section style={contentStyle}>
          <Heading style={h1}>Seja bem-vindo, {userName}!</Heading>
          
          <Text style={text}>
            Estamos muito felizes em ter você no <strong>{appName}</strong>. 
            Sua conta já está pronta para uso e você pode começar a explorar 
            nossa plataforma agora mesmo.
          </Text>

          <Text style={text}>
            Para começar, verifique seu e-mail clicando no botão abaixo:
          </Text>

          <Section style={centerSection}>
            <Link 
              href={`${appUrl}/verificar-email?token=${verificationToken}`} 
              style={button}
            >
              Verificar E-mail
            </Link>
          </Section>

          <Text style={text}>
            Ou acesse diretamente o painel:
          </Text>

          <Section style={centerSection}>
            <Link href={appUrl} style={buttonSecondary}>
              Acessar o Painel
            </Link>
          </Section>

          <Text style={featuresTitle}>O que você pode fazer:</Text>
          
          <FeatureItem text="📋 Gerenciar chamados de suporte" />
          <FeatureItem text="👥 Gerenciar sua equipe" />
          <FeatureItem text="📊 Acompanhar métricas e relatórios" />
          <FeatureItem text="💰 Controlar vendas e clientes" />
        </Section>

        {/* Footer */}
        <Section style={footerStyle}>
          <Text style={footer}>
            Se você não criou uma conta no {appName}, ignore este e-mail.
          </Text>
          <Text style={footer}>
            © {new Date().getFullYear()} {appName}. Todos os direitos reservados.
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

// Componente auxiliar para lista de features
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
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
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
  letterSpacing: '-0.5px',
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
  margin: '0',
};

const buttonSecondary = {
  backgroundColor: '#764ba2',
  borderRadius: '6px',
  color: '#ffffff',
  display: 'inline-block',
  padding: '12px 24px',
  textDecoration: 'none',
  fontWeight: 'bold',
  fontSize: '14px',
  margin: '0',
};

const featuresTitle = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '24px 0 12px 0',
};

const featureItem = {
  color: '#444444',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '4px 0',
  paddingLeft: '8px',
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

module.exports = WelcomeEmail;