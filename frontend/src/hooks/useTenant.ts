import { useQuery } from '@tanstack/react-query';
import { getMyTenant } from '@/services/api/tenants.service';
import { useAuth } from './useAuth';

/**
 * Perfil do tenant da sessão (GET /tenants/me).
 * Disparado apenas com usuário autenticado; compartilhado via cache
 * (queryKey ['tenant', 'me']) entre Header e páginas.
 */
export function useTenant() {
  const { status } = useAuth();

  return useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: getMyTenant,
    enabled: status === 'authenticated',
  });
}
