import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { assinaturaService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './BillingUpgrade.css';

// Intervalo de polling del endpoint /api/webhooks/status
const POLL_INTERVAL_MS = 5000;
const MAX_POLL_ATTEMPTS = 60; // 60 * 5s = 5 minutos de espera

/**
 * Página de Upgrade / Reativação de Assinatura
 *
 * Exibida quando:
 * - PAST_DUE: Pagamento vencido (mostra link da fatura)
 * - CANCELED: Assinatura cancelada (mostra planos para reativar)
 * - INCOMPLETE: Pagamento não concluído (mostra link da fatura)
 * - NO_SUBSCRIPTION: Sem assinatura (mostra planos)
 *
 * Flujo de checkout:
 * 1. Usuario elege plano + método de pagamento (PIX/Boleto/Cartão)
 * 2. POST /api/assinatura/checkout → o Asaas cria a cobranza
 * 3. Se abre o invoiceUrl de Asaas en nova pestanya
 * 4. Polling a GET /api/webhooks/status (o webhook do gateway atualiza la BD)
 * 5. Quando hasAccess=true → redirección ao Dashboard (/)
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
  const [checkoutInfo, setCheckoutInfo] = useState(null);
  const [polling, setPolling] = useState(false);
  const [pollMessage, setPollMessage] = useState('');
  const [error, setError] = useState(null);

  // Mensajes de bloqueo según el motivo
  const blockInfo = getBlockInfo(reason);

  // Cargar planos + assinatura atual
  useEffect(() => {
    async function loadData() {
      try {
        const [planosRes, assinaturaRes] = await Promise.allSettled([
          assinaturaService.listarPlanos(),
          assinaturaService.minhaAssinatura(),
        ]);

        if (planosRes.status === 'fulfilled') {
          setPlanos(planosRes.value.data.planos);
        }

        if (assinaturaRes.status === 'fulfilled') {
          setAssinaturaAtual(assinaturaRes.value.data);
        }
      } catch (err) {
        setError('Erro ao cargar datos. Tente novamente.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Si todo está pago, redirigir al dashboard
  useEffect(() => {
    if (
      !polling &&
      assinaturaAtual?.subscription?.status === 'ACTIVE' &&
      assinaturaAtual?.subscription?.isExpired === false
    ) {
      navigate('/', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinaturaAtual, polling]);

  /**
   * Polling ao endpoint /api/webhooks/status.
   * Quando hasAccess=true, libera o dashboard.
   * O estado REAL vem do webhook do gateway (nunca do cliente).
   */
  const startPolling = () => {
    setPolling(true);
    setPollMessage('Aguardando confirmação do pagamento...');
    const pollStart = Date.now();

    const tick = async () => {
      // Límite de tiempo (5 minutos)
      if (Date.now() - pollStart > POLL_INTERVAL_MS * MAX_POLL_ATTEMPTS) {
        setPolling(false);
        setPollMessage(
          'Ainda não vimos a confirmação do pagamento. Você pode continuar aguardando ou tentar novamente.'
        );
        return;
      }

      try {
        const response = await assinaturaService.status();
        const status = response.data;

        if (status.hasAccess) {
          setPolling(false);
          setPollMessage('✅ Pagamento confirmado! Redirecionando ao painel...');
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 800);
          return;
        }

        const remainingMinutes = Math.max(
          Math.ceil((POLL_INTERVAL_MS * MAX_POLL_ATTEMPTS - (Date.now() - pollStart)) / 60000),
          0
        );
        setPollMessage(`Aguardando confirmação do pagamento... (${remainingMinutes} min restantes)`);
      } catch (err) {
        setPollMessage('Verificando estado do pagamento...');
      }

      setTimeout(tick, POLL_INTERVAL_MS);
    };

    setTimeout(tick, POLL_INTERVAL_MS);
  };

  // Crear checkout para el plano seleccionado
  const handleCheckout = async (planId) => {
    setCheckoutLoading(true);
    setError(null);
    setCheckoutInfo(null);
    setPollMessage('');

    try {
      const response = await assinaturaService.criarCheckout({
        planId,
        billingType: selectedBilling,
      });

      const { checkout } = response.data;

      setCheckoutInfo(checkout);

      // Abrir página de pago de Asaas (hosted checkout) en nova pestanya
      if (checkout.invoiceUrl) {
        window.open(checkout.invoiceUrl, '_blank');
      }

      // Iniciar polling de /api/webhooks/status (asíncrono)
      startPolling();
    } catch (err) {
      const message = err.response?.data?.message || 'Erro ao criar checkout';
      setError(message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  if (loading) {
    return <div className="billing-loading">Carregando...</div>;
  }

  return (
    <div className="billing-page">
      <div className="billing-card">
        <div className="billing-header">
          <div className={`billing-icon-large ${blockInfo.iconClass}`}>{blockInfo.icon}</div>
          <h1>{blockInfo.title}</h1>
          <p>{blockInfo.subtitle}</p>
        </div>

        <div className="billing-user">
          <span className="billing-user-label">Assinando como</span>
          <strong>{user?.nome}</strong>
          <span className="billing-user-email">{user?.email}</span>
        </div>

        {/* Erro do checkout */}
        {error && (
          <div className="billing-error">
            <span>⚠️</span>
            {error}
          </div>
        )}

        {/* Fatura pendente (PAST_DUE / INCOMPLETE) */}
        {assinaturaAtual?.subscription?.lastInvoiceUrl && !selectedPlan && !checkoutInfo && (
          <div className="billing-pending-invoice">
            <h3>Fatura pendente</h3>
            <p>
              Você tem uma fatura pendente. Pague através do link abaixo ou
              escolha um novo plano para reativar:
            </p>
            <a
              href={assinaturaAtual.subscription.lastInvoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary btn-invoice"
            >
              💳 Pagar Fatura Pendente
            </a>
            <span className="billing-or">ou</span>
          </div>
        )}

        {/* Selección de planos */}
        {!checkoutInfo && (
          <>
            <h3 className="billing-plans-title">Escolha um plano</h3>
            <div className="billing-plans">
              {planos.map((plano) => (
                <div
                  key={plano.id}
                  className={`billing-plan-card ${selectedPlan === plano.id ? 'active' : ''}`}
                  onClick={() => setSelectedPlan(plano.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelectedPlan(plano.id);
                  }}
                >
                  <h4>{plano.name}</h4>
                  <p className="billing-plan-price">
                    R$ {plano.price.toLocaleString('pt-BR')}
                    <span>/mes</span>
                  </p>
                  <ul>
                    {plano.features.map((feature) => (
                      <li key={feature}>✔ {feature}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Formas de pago */}
            {selectedPlan && (
              <div className="billing-payment">
                <h3>Forma de pagamento</h3>
                <div className="billing-types">
                  {['PIX', 'BOLETO', 'CREDIT_CARD'].map((type) => (
                    <button
                      key={type}
                      className={`billing-type-btn ${selectedBilling === type ? 'active' : ''}`}
                      onClick={() => setSelectedBilling(type)}
                      type="button"
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
                  type="button"
                >
                  {checkoutLoading ? (
                    <>
                      <span className="spinner-small" />
                      Criando checkout...
                    </>
                  ) : (
                    `Assinar Plano ${planos.find((p) => p.id === selectedPlan)?.name}`
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* Datos del checkout + instrucciones */}
        {checkoutInfo && (
          <div className="billing-checkout-info">
            <h3>Finalize o pagamento</h3>

            <div className="billing-checkout-details">
              <p>
                <strong>Plano:</strong> {planos.find((p) => p.id === selectedPlan)?.name}
              </p>
              <p>
                <strong>Valor:</strong> R$ {(checkoutInfo.value || 0).toLocaleString('pt-BR')}
              </p>
              <p>
                <strong>Método:</strong> {getBillingLabel(checkoutInfo.billingType)}
              </p>
            </div>

            {checkoutInfo.pixQrCode && (
              <div className="billing-pix-block">
                <p><strong>Escaneie o QR code com seu banco:</strong></p>
                <img src={checkoutInfo.pixQrCode} alt="QR PIX" className="billing-pix-qr" />
                {checkoutInfo.pixKey && (
                  <div className="billing-pix-key">
                    <strong>PIX Copia e Cola:</strong>
                    <code>{checkoutInfo.pixKey}</code>
                  </div>
                )}
              </div>
            )}

            {checkoutInfo.bankSlipUrl && (
              <div className="billing-boleto-block">
                <p><strong>Boleto generado:</strong></p>
                <a href={checkoutInfo.bankSlipUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
                  📄 Descargar Boleto
                </a>
              </div>
            )}

            {checkoutInfo.invoiceUrl && (
              <div className="billing-invoice-block">
                <p><strong>Link de pagamento seguro (Asaas):</strong></p>
                <a href={checkoutInfo.invoiceUrl} target="_blank" rel="noreferrer" className="btn btn-primary">
                  💳 Ir al Pagamento
                </a>
              </div>
            )}

            {/* Estado do polling do webhook */}
            {polling && (
              <div className="billing-polling">
                <span className="spinner-small" />
                <p>{pollMessage || 'Aguardando confirmação do pagamento...'}</p>
                <p className="billing-polling-hint">
                  <small>
                    O pagamento é confirmado automáticamente pelo webhook.
                    Esta página se atualizará sola cuando el banco confirme.
                  </small>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Acciones */}
        <div className="billing-actions">
          <button className="btn btn-link" onClick={handleLogout} type="button">
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
      iconClass: 'icon-blocked',
    },
    past_due: {
      title: '⚠️ Pagamento Vencido',
      subtitle: 'Sua fatura está vencida. Acesse o link abaixo para pagar e reativar seu acesso imediatamente.',
      icon: '⚠️',
      iconClass: 'icon-warning',
    },
    canceled: {
      title: '🛑 Assinatura Cancelada',
      subtitle: 'Sua assinatura foi cancelada. Escolha um plano abaixo para reativar seu acesso.',
      icon: '🛑',
      iconClass: 'icon-canceled',
    },
    incomplete: {
      title: '⏳ Pagamento Pendente',
      subtitle: 'Seu pagamento ainda não foi confirmado. Finalize o pagamento ou escolha outro plano.',
      icon: '⏳',
      iconClass: 'icon-pending',
    },
    no_subscription: {
      title: '🚀 Comece Agora',
      subtitle: 'Escolha o plano ideal para sua empresa e comece a usar o ROTINA.',
      icon: '🚀',
      iconClass: 'icon-new',
    },
  };

  return info[reason] || info.payment_required;
}

function getStatusLabel(status) {
  const labels = {
    ACTIVE: 'Ativo',
    PAST_DUE: 'Vencido',
    CANCELED: 'Cancelado',
    INCOMPLETE: 'Incompleto',
    TRIALING: 'Período de Teste',
  };
  return labels[status] || status;
}

function getBillingIcon(type) {
  const icons = {
    PIX: '💳',
    BOLETO: '📄',
    CREDIT_CARD: '💳',
  };
  return <span className="billing-icon">{icons[type]}</span>;
}

function getBillingLabel(type) {
  const labels = {
    PIX: 'PIX (aprovado na hora)',
    BOLETO: 'Boleto (confirmação em 48h)',
    CREDIT_CARD: 'Cartão de Crédito',
  };
  return labels[type] || type;
}