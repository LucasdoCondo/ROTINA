import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as membersApi from './members.service';
import type { MemberListParams, UpdateMemberInput, UpdateSubscriptionInput } from './members.service';

/** Queries do módulo de Membros (cache por filtros). */

export function useMembers(params: MemberListParams) {
  return useQuery({
    queryKey: ['members', params],
    queryFn: () => membersApi.listMembers(params),
  });
}

export function useMember(id: string | undefined) {
  return useQuery({
    queryKey: ['member', id],
    queryFn: () => membersApi.getMember(id!),
    enabled: Boolean(id),
  });
}

export function useSubscription(id: string | undefined) {
  return useQuery({
    queryKey: ['subscription', id],
    queryFn: () => membersApi.getSubscription(id!),
    enabled: Boolean(id),
  });
}

/**
 * Mutations de Membros. Cada sucesso invalida a lista e (quando aplicável)
 * o detalhe, mantendo a UI coerente sem refetch manual.
 */
export function useMemberMutations() {
  const queryClient = useQueryClient();

  const invalidateList = () => queryClient.invalidateQueries({ queryKey: ['members'] });
  const invalidateMember = (memberId: string) => {
    void queryClient.invalidateQueries({ queryKey: ['member', memberId] });
  };

  const update = useMutation({
    mutationFn: (vars: { id: string; input: UpdateMemberInput }) =>
      membersApi.updateMember(vars.id, vars.input),
    onSuccess: (_data, vars) => {
      invalidateList();
      invalidateMember(vars.id);
    },
  });

  const suspend = useMutation({
    mutationFn: (id: string) => membersApi.suspendMember(id),
    onSuccess: (_data, id) => {
      invalidateList();
      invalidateMember(id);
    },
  });

  const activate = useMutation({
    mutationFn: (id: string) => membersApi.activateMember(id),
    onSuccess: (_data, id) => {
      invalidateList();
      invalidateMember(id);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => membersApi.deleteMember(id),
    onSuccess: invalidateList,
  });

  const updateSubscription = useMutation({
    mutationFn: (vars: { id: string; input: UpdateSubscriptionInput }) =>
      membersApi.updateSubscription(vars.id, vars.input),
    onSuccess: () => {
      invalidateList();
      void queryClient.invalidateQueries({ queryKey: ['subscription'] });
    },
  });

  return { update, suspend, activate, remove, updateSubscription };
}
