import { useEffect } from 'react';
import '../layouts/LegalPages.css';

export function Terms() {
  useEffect(() => {
    document.title = 'Termos de Uso';
  }, []);

  return (
    <div className="legal-page">
      <div className="legal-container">
        <h1>Termos de Uso</h1>
        <p className="last-updated">Última atualização: 29 de julho de 2026</p>

        <section>
          <h2>1. Aceitação dos Termos</h2>
          <p>
            Ao acessar e utilizar o ROTINA, você concorda em cumprir estes Termos de Uso.
            Se você não concordar com qualquer parte destes termos, não deverá utilizar o serviço.
          </p>
        </section>

        <section>
          <h2>2. Descrição do Serviço</h2>
          <p>
            O ROTINA é uma plataforma SaaS B2B que oferece ferramentas de CRM, gestão de chamados,
            e-commerce e automação para empresas. O serviço inclui módulos configuráveis conforme
            o plano contratado.
          </p>
        </section>

        <section>
          <h2>3. Disponibilidade (SLA)</h2>
          <p>
            Comprometemo-nos a manter o serviço disponível com os seguintes níveis:
          </p>
          <ul>
            <li><strong>Disponibilidade alvo (SLA):</strong> 99.5% mensal</li>
            <li><strong>Manutenções programadas:</strong> Comunicadas com antecedência mínima de 48h</li>
            <li><strong>Indisponibilidades não programadas:</strong> Monitoramento 24/7 com resposta em até 1 hora</li>
          </ul>
        </section>

        <section>
          <h2>4. Uso Aceitável</h2>
          <p>
            Você concorda em não utilizar o serviço para:
          </p>
          <ul>
            <li>Atividades ilegais ou fraudulentas</li>
            <li>Violar direitos de propriedade intelectual</li>
            <li>Transmitir malware ou código malicioso</li>
            <li>Sobrecarregar propositalmente a infraestrutura</li>
            <li>Acessar dados de outros tenants sem autorização</li>
          </ul>
        </section>

        <section>
          <h2>5. Responsabilidade</h2>
          <p>
            O ROTINA não se responsabiliza por:
          </p>
          <ul>
            <li>Perda de dados decorrente de mau uso ou falhas de conexão do cliente</li>
            <li>Interrupções causadas por força maior ou casos fortuitos</li>
            <li>Ações de terceiros que afetem a disponibilidade do serviço</li>
            <li>Danos indiretos, including lucros cessantes</li>
          </ul>
          <p>
            <strong>Limite de responsabilidade:</strong> O valor máximo de indenização é limitado
            ao valor pago pelo cliente nos últimos 12 meses.
          </p>
        </section>

        <section>
          <h2>6. Cancelamento e Reembolso</h2>
          <p>
            <strong>Cancelamento pelo cliente:</strong>
          </p>
          <ul>
            <li>Pode ser solicitado a qualquer momento pela plataforma</li>
            <li>Não há multa por cancelamento antecipado</li>
            <li>O serviço permanece ativo até o final do período pago</li>
          </ul>
          <p>
            <strong>Reembolso:</strong>
          </p>
          <ul>
            <li>Reembolsos proporcionais são concedidos em até 30 dias após solicitação</li>
            <li>Não há reembolso para períodos já utilizados após cancelamento voluntário</li>
            <li>Indisponibilidade superior a 48h consecutivas dá direito a crédito proporcional</li>
          </ul>
        </section>

        <section>
          <h2>7. Propriedade Intelectual</h2>
          <p>
            O ROTINA e seu código, design, marcas e conteúdos são protegidos por direitos autorais
            e propriedade intelectual. O cliente recebe apenas uma licença limitada de uso.
          </p>
        </section>

        <section>
          <h2>8. Privacidade e Dados</h2>
          <p>
            O tratamento de dados pessoais é regido pela nossa <a href="/privacy">Política de Privacidade</a>
            e pela Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).
          </p>
        </section>

        <section>
          <h2>9. Alterações nos Termos</h2>
          <p>
            Reservamo-nos o direito de modificar estes termos a qualquer momento.
            Mudanças substanciais serão comunicadas com 30 dias de antecedência.
          </p>
        </section>

        <section>
          <h2>10. Legislação Aplicável</h2>
          <p>
            Estes termos são regidos pelas leis da República Federativa do Brasil.
            Qualquer disputa será resolvida no foro da comarca de São Paulo/SP.
          </p>
        </section>

        <section>
          <h2>11. Contato</h2>
          <p>
            Para questões sobre estes termos, entre em contato:
            <br />
            E-mail: contato@endereco-empresa.com
          </p>
        </section>
      </div>
    </div>
  );
}