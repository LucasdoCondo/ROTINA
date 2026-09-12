import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ecommerceApi from './ecommerce.service';
import * as crmApi from '@/features/crm/crm.service';
import type {
  CreateOrderInput,
  CreateProductInput,
  OrderListParams,
  OrderStatus,
  ProductListParams,
  UpdateProductInput,
} from './ecommerce.service';

/** Queries do módulo E-commerce (cache por filtros). */

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: ['ecommerce', 'products', params],
    queryFn: () => ecommerceApi.listProducts(params),
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['ecommerce', 'product', id],
    queryFn: () => ecommerceApi.getProduct(id!),
    enabled: Boolean(id),
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: ['crm', 'customers', { page: 1, pageSize: 100 }],
    queryFn: () => crmApi.listCustomers({ page: 1, pageSize: 100 }),
  });
}

export function useOrders(params: OrderListParams) {
  return useQuery({
    queryKey: ['ecommerce', 'orders', params],
    queryFn: () => ecommerceApi.listOrders(params),
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: ['ecommerce', 'order', id],
    queryFn: () => ecommerceApi.getOrder(id!),
    enabled: Boolean(id),
  });
}

/**
 * Mutations de E-commerce. Cada sucesso invalida a lista e (quando aplicável)
 * o detalhe, mantendo a UI coerente sem refetch manual.
 */
export function useEcommerceMutations() {
  const queryClient = useQueryClient();

  const invalidateProducts = () =>
    queryClient.invalidateQueries({ queryKey: ['ecommerce', 'products'] });
  const invalidateOrders = () =>
    queryClient.invalidateQueries({ queryKey: ['ecommerce', 'orders'] });

  const createProduct = useMutation({
    mutationFn: (input: CreateProductInput) => ecommerceApi.createProduct(input),
    onSuccess: invalidateProducts,
  });

  const updateProduct = useMutation({
    mutationFn: (vars: { id: string; input: UpdateProductInput }) =>
      ecommerceApi.updateProduct(vars.id, vars.input),
    onSuccess: () => {
      invalidateProducts();
    },
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => ecommerceApi.deleteProduct(id),
    onSuccess: invalidateProducts,
  });

  const createOrder = useMutation({
    mutationFn: (input: CreateOrderInput) => ecommerceApi.createOrder(input),
    onSuccess: invalidateOrders,
  });

  const updateOrderStatus = useMutation({
    mutationFn: (vars: { id: string; status: OrderStatus }) =>
      ecommerceApi.updateOrderStatus(vars.id, vars.status),
    onSuccess: () => {
      invalidateOrders();
    },
  });

  return { createProduct, updateProduct, deleteProduct, createOrder, updateOrderStatus };
}