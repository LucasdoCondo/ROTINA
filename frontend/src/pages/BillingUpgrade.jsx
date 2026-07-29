import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { assinaturaService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './BillingUpgrade.css';

/**
 * Página de Upgrade / Reativação de Assinatura
 * 
 * Exibida quando:
 * - PAST_DUE: Pagamento vencido (mostra link da fatura)
 * - CANCELED: Assinatura cancelada (mostra planos para reativar)
 * - INCOMPLETE: Pagamento não concluído (mostra link da fatura)
 * - NO_SUBSCRIPTION: Sem assinatura (mostra planos)
 */
export function BillingUpgrade() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout } = useAuth();
  
  const reason = searchParams.get('reason') || 'payment_required';
  
  const [planos, setPlanos] = useState([]);
  const [assinaturaAtual, setAssinaturaAtual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedBilling, setSelectedBilling] = useState('PIX');
  const [error, setError] = useState(null);

  // Mensagens e configurações baseadas no motivo do bloqueio
  const blockInfo = getBlockInfo(reason);

  useEffect(() => {
    async function loadData() {
      try {
        const [planosRes, assinaturaRes] = await Promise.allSettled([
          assinaturaService.listarPlanos(),
          assinaturaService.minhaAssinatura()
        ]);

        if (planosRes.status === 'fulfilled') {
          setPlanos(planosRes.value.data.planos);
        }

        if (assinaturaRes.status === 'fulfilled') {
          setAssinaturaAtual(assinaturaRes.value.data);
        }
      } catch (err) {
        setError('Erro ao carregar dados. Tente novamente.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Criar checkout para o plano selecionado
  const handleCheckout = async (planId) => {
    setCheckoutLoading(true);
    setError(null);

    try {
      const response = await assinaturaService.criarCheckout({
        planId,
        billingType: selectedBilling
      });

      const { checkout } = response.data;

      // Redirecionar para a página de pagamento do Asaas
      if (checkout.invoiceUrl) {
        window.open(checkout.invoiceUrl, '_blank');
      }

      // Mostrar mensagem de sucesso
      alert(`Checkout criado! Finalize o pagamento via ${selectedBilling}.`);

      // Aguardar confirmação do webhook (polling a cada 5s)
      await waitForPaymentConfirmation();

    } catch (err) {
      const message = err.response?.data?.message || 'Erro ao criar checkout';
      setError(message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Polling para aguardar confirmação do pagamento via webhook
  const waitForPaymentConfirmation = async () => {
    return new Promise((resolve) => {
      const maxAttempts = 30; // 30 tentativas * 5s = 2.5 minutos
      let attempts = 0;

      const interval = setInterval(async () => {
        attempts++;

        try {
          const response = await assinaturaService.status();
          
          if (response.data.hasAccess) {
            clearInterval(interval);
            alert('✅ Pagamento confirmado! Seu acesso foi liberado.');
            window.location.href = '/dashboard';
            resolve();
          }
        } catch (err) {
          // Ignorar erros durante polling
        }

        if (attempts >= maxAttempts) {
          clearInterval(interval);
          resolve();
        }
      }, 5000);
    });
  };

  // Logout e redirecionar para login
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="billing-loading">
        <div className="spinner" />
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="billing-upgrade-page">
      <div className="billing-container">
        {/* Header */}
        <div className="billing-header">
          <div className={`billing-icon ${blockInfo.iconClass}`}>
            {blockInfo.icon}
          </div>
          <h1>{blockInfo.title}</h1>
          <p className="billing-subtitle">{blockInfo.subtitle}</p>
          {assinaturaAtual?.subscription?.lastInvoiceUrl && (
            <a
              href={assinaturaAtual.subscription.lastInvoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              🔗 Acessar fatura pendente
            </a>
          )}
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="billing-error">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Planos disponíveis */}
        <div className="billing-plans">
          <h2>Escolha seu plano</h2>
          
          {assinaturaAtual?.subscription && (
            <div className="billing-current-plan">
              <p>
                Plano atual: <strong>{assinaturaAtual.plan?.name || assinaturaAtual.subscription.planId}</strong>
                {' | '}Status: <strong className={`status-${assinaturaAtual.subscription.status?.toLowerCase()}`}>
                  {getStatusLabel(assinaturaAtual.subscription.status)}
                </strong>
              </p>
            </div>
          )}

          <div className="plans-grid">
            {planos.map((plano) => (
              <div
                key={plano.id}
                className={`plan-card ${selectedPlan === plano.id ? 'selected' : ''}`}
                onClick={() => setSelectedPlan(plano.id)}
              >
                <div className="plan-header">
                  <h3>{plano.name}</h3>
                  <div className="plan-price">
                    <span className="price">R$ {plano.price.toFixed(2)}</span>
                    <span className="period">/mês</span>
                  </div>
                </div>
                <p className="plan-description">{plano.description}</p>
                <ul className="plan-features">
                  {plano.features.map((feature, index) => (
                    <li key={index}>✅ {feature}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Forma de pagamento */}
        {selectedPlan && (
          <div className="billing-payment">
            <h3>Forma de pagamento</h3>
            <div className="billing-types">
              {['PIX', 'BOLETO', 'CREDIT_CARD'].map((type) => (
                <button
                  key={type}
                  className={`billing-type-btn ${selectedBilling === type ? 'active' : ''}`}
                  onClick={() => setSelectedBilling(type)}
                >
                  {getBillingIcon(type)}
                  <span>{getBillingLabel(type)}</span>
                </button>
              ))}
            </div>

            <button
              className="btn btn-primary btn-checkout"
              onClick={() => handleCheckout(selectedPlan)}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? (
                <>
                  <span className="spinner-small" />
                  Criando checkout...
                </>
              ) : (
                `Assinar Plano ${planos.find(p => p.id === selectedPlan)?.name}`
              )}
            </button>
          </div>
        )}

        {/* Ações */}
        <div className="billing-actions">
          <button className="btn btn-link" onClick={handleLogout}>
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function getBlockInfo(reason) {
  const info = {
    payment_required: {
      title: '🔒 Acesso Bloqueado',
      subtitle: 'Sua assinatura está pendente de pagamento. Regularize para continuar usando o sistema.',
      icon: '🔒',
      iconClass: 'icon-blocked'
    },
    past_due: {
      title: '⚠️ Pagamento Vencido',
      subtitle: 'Sua fatura está vencida. Acesse o link abaixo para pagar e reativar seu acesso imediatamente.',
      icon: '⚠️',
      iconClass: 'icon-warning'
    },
    canceled: {
      title: '🛑 Assinatura Cancelada',
      subtitle: 'Sua assinatura foi cancelada. Escolha um plano abaixo para reativar seu acesso.',
      icon: '🛑',
      iconClass: 'icon-canceled'
    },
    incomplete: {
      title: '⏳ Pagamento Pendente',
      subtitle: 'Seu pagamento ainda não foi confirmado. Finalize o pagamento ou escolha outro plano.',
      icon: '⏳',
      iconClass: 'icon-pending'
    },
    no_subscription: {
      title: '🚀 Comece Agora',
      subtitle: 'Escolha o plano ideal para sua empresa e comece a usar o ROTINA.',
      icon: '🚀',
      iconClass: 'icon-new'
    }
  };

  return info[reason] || info.payment_required;
}

function getStatusLabel(status) {
  const labels = {
    ACTIVE: 'Ativo',
    PAST_DUE: 'Vencido',
    CANCELED: 'Cancelado',
    INCOMPLETE: 'Incompleto',
    TRIALING: 'Período de Teste'
  };
  return labels[status] || status;
}

function getBillingIcon(type) {
  const icons = {
    PIX: '💳',
    BOLETO: '📄',
    CREDIT_CARD: '💳'
  };
  return <span className="billing-icon">{icons[type]}</span>;
}

function getBillingLabel(type) {
  const labels = {
    PIX: 'PIX (aprovado na hora)',
    BOLETO: 'Boleto (confirmação em 48h)',
    CREDIT_CARD: 'Cartão de Crédito'
  };
  return labels[type];
}