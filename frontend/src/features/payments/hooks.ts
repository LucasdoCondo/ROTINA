import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentsService, type CheckoutInput } from './payments.service';

export const paymentsKeys = {
  subscription: ['payments', 'subscription'] as const,
};

/** Assinatura atual + plano do tenant. */
export function useSubscription() {
  return useQuery({
    queryKey: paymentsKeys.subscription,
    queryFn: () => paymentsService.getSubscription(),
    staleTime: 60_000,
  });
}

/** Checkout (muda de plano) → invalida subscription + tenant. */
export function useCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CheckoutInput) => paymentsService.checkout(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentsKeys.subscription });
    },
  });
}

/** Cancelamento (fim do período) → invalida subscription. */
export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => paymentsService.cancel(true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentsKeys.subscription });
    },
  });
}