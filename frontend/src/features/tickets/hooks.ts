import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ticketsApi from './tickets.service';
import type {
  AddTicketMessageInput,
  TicketListParams,
  UpdateTicketInput,
} from './tickets.service';

/** Queries do módulo de Chamados (cache por filtros — TanStack Hashes objetos). */

export function useTickets(params: TicketListParams) {
  return useQuery({
    queryKey: ['tickets', params],
    queryFn: () => ticketsApi.listTickets(params),
  });
}

export function useTicket(id: string | undefined) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => ticketsApi.getTicket(id!),
    enabled: Boolean(id),
  });
}

export function useTicketMessages(id: string | undefined, refetchInterval: number | false = false) {
  return useQuery({
    queryKey: ['ticket-messages', id],
    queryFn: () => ticketsApi.listTicketMessages(id!),
    enabled: Boolean(id),
    // Polling leve para o "quase-tempo-real": o backend não tem WebSocket,
    // então o histórico é revalidado em intervalo enquanto a página está aberta.
    refetchInterval,
    refetchIntervalInBackground: false,
  });
}

/**
 * Mutations de Chamados. Cada sucesso invalida a lista e (quando aplicável)
 * o detalhe + histórico, mantendo a UI coerente sem refetch manual.
 */
export function useTicketMutations() {
  const queryClient = useQueryClient();

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: ['tickets'] });
  const invalidateTicket = (ticketId: string) => {
    void queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
    void queryClient.invalidateQueries({ queryKey: ['ticket-messages', ticketId] });
  };

  const create = useMutation({
    mutationFn: (input: ticketsApi.CreateTicketInput) => ticketsApi.createTicket(input),
    onSuccess: invalidateList,
  });

  const update = useMutation({
    mutationFn: (vars: { id: string; input: UpdateTicketInput }) =>
      ticketsApi.updateTicket(vars.id, vars.input),
    onSuccess: (_data, vars) => {
      invalidateList();
      invalidateTicket(vars.id);
    },
  });

  const assign = useMutation({
    mutationFn: (vars: { id: string; assigneeId: string }) =>
      ticketsApi.assignTicket(vars.id, vars.assigneeId),
    onSuccess: (_data, vars) => {
      invalidateList();
      invalidateTicket(vars.id);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => ticketsApi.deleteTicket(id),
    onSuccess: invalidateList,
  });

  const addMessage = useMutation({
    mutationFn: (vars: { id: string; input: AddTicketMessageInput }) =>
      ticketsApi.addTicketMessage(vars.id, vars.input),
    onSuccess: (_data, vars) => invalidateTicket(vars.id),
  });

  return { create, update, assign, remove, addMessage };
}
