import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/types/api';

/**
 * Cliente global do TanStack Query.
 * - Cache curto (staleTime 30s) adequado a dados operacionais;
 * - 4xx NUNCA tem retry (erro de cliente/autorização); 5xx tenta até 2x;
 * - Sem refetch em foco para não "piscar" a UI em multi-tabs.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
