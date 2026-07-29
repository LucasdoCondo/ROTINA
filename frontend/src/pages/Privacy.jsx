import { useEffect } from 'react';
import '../layouts/LegalPages.css';

export function Privacy() {
  useEffect(() => {
    document.title = 'Política de Privacidade';
  }, []);

  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1>Política de Privacidade</h1>
        <p className="last-updated">Última atualização: 29 de julho de 2026</p>

        <section>
          <h2>1. Introdução</h2>
          <p>
            Esta Política de Privacidade descreve como o ROTINA coleta, utiliza, armazena e protege
            seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD -
            Lei 13.709/2018).
          </p>
        </section>

        <section>
          <h2>2. Dados Coletados</h2>
          <p>Coletamos apenas os dados necessários para a prestação do serviço:</p>
          <ul>
            <li><strong>Nome completo:</strong> Para identificação e comunicação</li>
            <li><strong>E-mail:</strong> Para autenticação, notificações e suporte</li>
            <li><strong>Senha:</strong> Armazenada de forma hash (criptografada)</li>
            <li><strong>Endereço IP:</strong> Para segurança e auditoria</li>
            <li><strong>Dados de uso:</strong> Registros de acesso e atividades no sistema</li>
            <li><strong>Dados da empresa (tenant):</strong> CNPJ, endereço, telefone</li>
          </ul>
        </section>

        <section>
          <h2>3. Finalidade do Tratamento</h2>
          <p>Seus dados são utilizados exclusivamente para:</p>
          <ul>
            <li>Prestação do serviço contratado (operações do sistema)</li>
            <li>Autenticação e segurança da conta</li>
            <li>Comunicações relacionadas ao serviço (suporte, atualizações)</li>
            <li>Cumprimento de obrigações legais e regulatórias</li>
            <li>Melhoria contínua da plataforma (análises agregadas e anonimizadas)</li>
          </ul>
          <p>
            <strong>Não vendemos, alugamos ou compartilhamos seus dados com terceiros</strong>
            para fins de marketing ou publicidade.
          </p>
        </section>

        <section>
          <h2>4. Base Legal para Tratamento</h2>
          <p>O tratamento de dados é fundamentado nas seguintes bases legais (LGPD Art. 7):</p>
          <ul>
            <li><strong>Execução de contrato:</strong> Para fornecer o serviço contratado</li>
            <li><strong>Cumprimento de obrigação legal:</strong> Para requisitos fiscais e contábeis</li>
            <li><strong>Legítimo interesse:</strong> Para segurança e prevenção de fraudes</li>
            <li><strong>Consentimento:</strong> Quando necessário para finalidades específicas</li>
          </ul>
        </section>

        <section>
          <h2>5. Retenção de Dados</h2>
          <p>Seus dados são mantidos pelo seguinte período:</p>
          <ul>
            <li><strong>Durante a vigência do contrato:</strong> Dados ativos da conta</li>
            <li><strong>Após cancelamento:</strong> 5 anos (para cumprimento de obrigações legais)</li>
            <li><strong>Logs de auditoria:</strong> 1 ano (conformidade com normas de segurança)</li>
            <li><strong>Dados fiscais:</strong> 5 anos (requisito da Receita Federal)</li>
          </ul>
          <p>
            Após o período de retenção, os dados são excluídos de forma segura e irreversível.
          </p>
        </section>

        <section>
          <h2>6. Seus Direitos (LGPD)</h2>
          <p>Você tem direito a:</p>
          <ul>
            <li><strong>Confirmação de tratamento:</strong> Saber se seus dados são processados</li>
            <li><strong>Acesso:</strong> Visualizar seus dados pessoais</li>
            <li><strong>Correção:</strong> Atualizar dados incompletos ou incorretos</li>
            <li><strong>Portabilidade:</strong> Exportar seus dados em formato estruturado</li>
            <li><strong>Eliminação:</strong> Solicitar exclusão de dados (Direito ao Esquecimento)</li>
            <li><strong>Revogação de consentimento:</strong> Retirar consentimento a qualquer momento</li>
            <li><strong>Oposição:</strong> Contestar tratamento de dados em determinadas situações</li>
          </ul>
        </section>

        <section>
          <h2>7. Segurança</h2>
          <p>Adotamos medidas técnicas e organizacionais para proteger seus dados:</p>
          <ul>
            <li>Criptografia de senhas (bcrypt)</li>
            <li>Conexão HTTPS/TLS 1.3</li>
            <li>Controle de acesso baseado em funções (RBAC)</li>
            <li>Monitoramento e logs de auditoria</li>
            <li>Backups regulares e seguros</li>
            <li>Infraestrutura em servidores seguros</li>
          </ul>
        </section>

        <section>
          <h2>8. Cookies e Tecnologias Similares</h2>
          <p>
            Utilizamos tokens de autenticação (JWT) e cookies de sessão para manter sua conexão
            segura. Não utilizamos cookies de rastreamento ou publicidade de terceiros.
          </p>
        </section>

        <section>
          <h2>9. Transferência Internacional</h2>
          <p>
            Seus dados são armazenados em servidores localizados no Brasil. Eventuais transferências
            internacionais são realizadas apenas para países com nível de proteção adequado ou com
            garantias contratuais apropriadas.
          </p>
        </section>

        <section>
          <h2>10. Encarregado de Dados (DPO)</h2>
          <p>
            Para exercer seus direitos ou esclarecer dúvidas sobre tratamento de dados:
          </p>
          <ul>
            <li><strong>E-mail:</strong> privacidade@endereco-empresa.com</li>
            <li><strong>Prazo de resposta:</strong> Até 15 dias úteis</li>
          </ul>
        </section>

        <section>
          <h2>11. Alterações na Política</h2>
          <p>
            Esta política pode ser atualizada para refletir mudanças legislativas ou operacionais.
            Alterações substanciais serão comunicadas pelos canais de contato registrados.
          </p>
        </section>

        <section>
          <h2>12. Legislação Aplicável</h2>
          <p>
            Esta política é regida pela LGPD (Lei 13.709/2018) e pelas leis brasileiras.
            Qualquer questão não resolvida pode ser levida à Autoridade Nacional de Proteção
            de Dados (ANPD).
          </p>
        </section>
      </div>
    </div>
  );
}