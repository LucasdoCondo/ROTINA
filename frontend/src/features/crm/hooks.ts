import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as crmApi from './crm.service';
import type { CreateDealInput, CustomerListParams, DealListParams, DealStage, UpdateCustomerInput } from './crm.service';

/** Queries do CRM (namespace ['crm', …] — mutations invalidam o módulo inteiro,
 *  já que clientes e deals compartilham relações entre si). */

export function useCustomers(params: CustomerListParams, enabled = true) {
  return useQuery({
    queryKey: ['crm', 'customers', params],
    queryFn: () => crmApi.listCustomers(params),
    enabled,
  });
}

export function useDeals(params: DealListParams, enabled = true) {
  return useQuery({
    queryKey: ['crm', 'deals', params],
    queryFn: () => crmApi.listDeals(params),
    enabled,
  });
}

export function useDealFunnel(enabled = true) {
  return useQuery({
    queryKey: ['crm', 'funnel'],
    queryFn: crmApi.getDealFunnel,
    enabled,
  });
}

export function useCrmMutations() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['crm'] });

  const createCustomer = useMutation({
    mutationFn: (input: crmApi.CreateCustomerInput) => crmApi.createCustomer(input),
    onSuccess: invalidate,
  });

  const updateCustomer = useMutation({
    mutationFn: (vars: { id: string; input: UpdateCustomerInput }) =>
      crmApi.updateCustomer(vars.id, vars.input),
    onSuccess: invalidate,
  });

  const deleteCustomer = useMutation({
    mutationFn: (id: string) => crmApi.deleteCustomer(id),
    onSuccess: invalidate,
  });

  const createDeal = useMutation({
    mutationFn: (input: CreateDealInput) => crmApi.createDeal(input),
    onSuccess: invalidate,
  });

  const moveDeal = useMutation({
    mutationFn: (vars: { id: string; stage: DealStage }) => crmApi.moveDealStage(vars.id, vars.stage),
    onSuccess: invalidate,
  });

  const deleteDeal = useMutation({
    mutationFn: (id: string) => crmApi.deleteDeal(id),
    onSuccess: invalidate,
  });

  return { createCustomer, updateCustomer, deleteCustomer, createDeal, moveDeal, deleteDeal };
}
