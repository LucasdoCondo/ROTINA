import { useQuery } from '@tanstack/react-query';
import { listTickets, type TicketPriority, type TicketStatus } from '@/features/tickets/tickets.service';
import { getDealFunnel, listCustomers, type Deal } from '@/features/crm/crm.service';
import { useAuth } from './useAuth';

/**
 * Métricas do Dashboard Overview — agregadas no frontend a partir das
 * listagens existentes (o backend não expõe endpoint de overview).
 *
 * 1. Chamados: 1 request leve por status operacional (OPEN + IN_PROGRESS +
 *    WAITING_ON_CUSTOMER) com pageSize 1 — usa só o `meta.total`, sem trazer linhas.
 * 2. CRM: `useDealFunnel` (GET /crm/deals/funnel) + contagem de clientes ativos.
 *    O módulo CRM é STAFF-only (MEMBER recebe 403) → queries CRM ficam
 *    `enabled` só para ADMIN/AGENT (evita erro 403 no console do MEMBER).
 * 3. Novos membros: o backend não tem endpoint de listagem de usuários —
 *    o card exibe apenas o tenant/perfil, sem contagem (documentado na UI).
 */

const OPEN_TICKET_STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER'];

async function countTickets(status: TicketStatus, priority?: TicketPriority): Promise<number> {
  const result = await listTickets({ page: 1, pageSize: 1, status, priority });
  return result.meta.total;
}

/** Contagem de chamados abertos + breakdown por status e urgentes (HIGH+URGENT). */
export function useOpenTicketsMetric() {
  const { status } = useAuth();
  return useQuery({
    queryKey: ['dashboard', 'open-tickets'],
    queryFn: async () => {
      const [open, inProgress, waiting] = await Promise.all(
        OPEN_TICKET_STATUSES.map((s) => countTickets(s)),
      );
      const [high, urgent] = await Promise.all([
        countTickets('OPEN', 'HIGH'),
        countTickets('OPEN', 'URGENT'),
      ]);
      return {
        total: open + inProgress + waiting,
        byStatus: { OPEN: open, IN_PROGRESS: inProgress, WAITING_ON_CUSTOMER: waiting },
        urgentOpen: high + urgent,
      };
    },
    enabled: status === 'authenticated',
    staleTime: 60_000,
  });
}

/** Vendas no CRM: funil agregado + clientes + deals em aberto com valor. */
export function useSalesMetric() {
  const { status, hasRole } = useAuth();
  const isStaff = hasRole(['ADMIN', 'AGENT']);
  const enabled = status === 'authenticated' && isStaff;

  const funnel = useQuery({
    queryKey: ['dashboard', 'sales-funnel'],
    queryFn: getDealFunnel,
    enabled,
    staleTime: 60_000,
  });

  const customers = useQuery({
    queryKey: ['dashboard', 'sales-customers'],
    queryFn: () => listCustomers({ page: 1, pageSize: 1 }),
    enabled,
    staleTime: 60_000,
  });

  return { funnel, customers, enabled };
}

/** Top deals em aberto (por valor) para o painel "próximos fechamentos". */
export function rankOpenDeals(deals: Deal[], limit = 5): Deal[] {
  return [...deals]
    .filter((d) => d.stage !== 'WON' && d.stage !== 'LOST')
    .sort((a, b) => Number(b.value) - Number(a.value))
    .slice(0, limit);
}
