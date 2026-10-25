import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import type {
  Summary,
  Transaction,
  TransactionFilters,
  TransactionsPage,
  TransactionType,
} from './transactions.types';

export const useTransactions = (filters: TransactionFilters) =>
  useQuery({
    queryKey: ['transactions', filters],
    queryFn: () =>
      apiRequest<TransactionsPage>('/api/transactions', {
        query: {
          type: filters.type,
          categoryId: filters.categoryId,
          from: filters.from,
          to: filters.to,
          search: filters.search,
          page: filters.page ?? 1,
        },
      }),
  });

export const useSummary = (range?: { from?: string; to?: string }) =>
  useQuery({
    queryKey: ['summary', range],
    queryFn: () => apiRequest<Summary>('/api/transactions/summary', { query: range }),
  });

// No hay endpoint de detalle por id: se busca en cualquier pagina de
// /api/transactions que siga en cache (la lista de Movimientos, casi
// siempre), en vez de pasar el movimiento entero por la URL al editar.
export const useCachedTransaction = (id: string | undefined): Transaction | undefined => {
  const queryClient = useQueryClient();
  if (!id) return undefined;

  return queryClient
    .getQueriesData<TransactionsPage>({ queryKey: ['transactions'] })
    .flatMap(([, data]) => data?.transactions ?? [])
    .find((t) => t.id === id);
};

export interface TransactionInput {
  categoryId: string;
  type: TransactionType;
  amount: number;
  description?: string;
  occurredAt: string;
}

const invalidateAll = (queryClient: ReturnType<typeof useQueryClient>) => {
  queryClient.invalidateQueries({ queryKey: ['transactions'] });
  queryClient.invalidateQueries({ queryKey: ['summary'] });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TransactionInput) =>
      apiRequest<{ transaction: Transaction }>('/api/transactions', { method: 'POST', body: input }),
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<TransactionInput> & { id: string }) =>
      apiRequest<{ transaction: Transaction }>(`/api/transactions/${id}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/api/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateAll(queryClient),
  });
};
