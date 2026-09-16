import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import type { Summary, Transaction, TransactionFilters, TransactionsPage, TransactionType } from '@/types/api';

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
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
}

export function useSummary(range?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['summary', range],
    queryFn: () => apiRequest<Summary>('/api/transactions/summary', { query: range }),
  });
}

export interface TransactionInput {
  categoryId: string;
  type: TransactionType;
  amount: number;
  description?: string;
  occurredAt: string;
}

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['transactions'] });
  queryClient.invalidateQueries({ queryKey: ['summary'] });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TransactionInput) =>
      apiRequest<{ transaction: Transaction }>('/api/transactions', { method: 'POST', body: input }),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<TransactionInput> & { id: string }) =>
      apiRequest<{ transaction: Transaction }>(`/api/transactions/${id}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: () => invalidateAll(queryClient),
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/api/transactions/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateAll(queryClient),
  });
}
