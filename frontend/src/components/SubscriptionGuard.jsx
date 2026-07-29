import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { assinaturaService } from '../services/api';

/**
 * SubscriptionGuard - Bloqueia o acesso a rotas protegidas quando
 * a assinatura do tenant está vencida (PAST_DUE), cancelada (CANCELED)
 * ou incompleta (INCOMPLETE).
 * 
 * Funciona como um middleware no lado do cliente (React):
 * 1. Verifica o status da assinatura via API
 * 2. Se estiver ACTIVE → libera o acesso
 * 3. Se estiver PAST_DUE/CANCELED/INCOMPLETE → redireciona para /billing/upgrade
 * 
 * Isso NÃO substitui a validação no backend (middleware validateSubscription),
 * que é a verdadeira barreira de segurança.
 */
export function SubscriptionGuard({ children, fallback }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function checkSubscription() {
      // Se não está autenticado, não verificar assinatura
      if (!isAuthenticated) {
        setChecking(false);
        return;
      }

      try {
        // Verificar status da assinatura via API
        const response = await assinaturaService.status();
        
        if (cancelled) return;

        const { hasAccess, status, message, invoiceUrl, daysRemaining } = response.data;

        setSubscriptionStatus({
          hasAccess,
          status,
          message,
          invoiceUrl,
          daysRemaining
        });

        console.log(`[SubscriptionGuard] Status: ${status}, Acesso: ${hasAccess}`);

      } catch (err) {
        if (cancelled) return;
        
        // Se der erro na verificação, permitir acesso temporário
        // para não bloquear o usuário indevidamente
        console.warn('[SubscriptionGuard] Erro ao verificar assinatura, permitindo acesso:', err.message);
        setSubscriptionStatus({ hasAccess: true, status: 'UNKNOWN' });
        setError(err.message);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    checkSubscription();

    // Verificar periodicamente a cada 5 minutos
    const interval = setInterval(checkSubscription, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  // Enquanto carrega
  if (authLoading || checking) {
    return fallback || (
      <div className="subscription-loading">
        <div className="spinner" />
        <p>Verificando acesso...</p>
      </div>
    );
  }

  // Se não está autenticado, renderiza children (o AuthGuard já redireciona)
  if (!isAuthenticated) {
    return children;
  }

  // Se tem acesso liberado (ACTIVE)
  if (subscriptionStatus?.hasAccess) {
    return children;
  }

  // ═══════════════════════════════════════════════
  // BLOQUEIO: Assinatura vencida ou cancelada
  // ═══════════════════════════════════════════════
  // Redireciona para página de upgrade com motivo
  const reason = subscriptionStatus?.status?.toLowerCase() || 'payment_required';
  const upgradeUrl = `/billing/upgrade?reason=${reason}`;

  // Usar window.location para redirecionamento imperativo
  // (força recarregamento e evita ciclos com o roteador)
  window.location.href = upgradeUrl;

  return null;
}

/**
 * Hook para verificar status da assinatura em componentes
 */
export function useSubscriptionStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const response = await assinaturaService.status();
        setStatus(response.data);
      } catch (err) {
        setStatus({ hasAccess: false, status: 'ERROR', message: err.message });
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  return { status, loading };
}