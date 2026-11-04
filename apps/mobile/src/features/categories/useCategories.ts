import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import type { TransactionType } from '@/features/transactions/transactions.types';
import type { Category } from './categories.types';

export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: () => apiRequest<{ categories: Category[] }>('/api/categories'),
    select: (data) => data.categories,
  });

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; type: TransactionType; color: string; icon: string }) =>
      apiRequest<{ category: Category }>('/api/categories', { method: 'POST', body: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
};

// Cambiar el nombre o el color. Los movimientos, el resumen y el presupuesto llevan el nombre y el color de la
// categoria dentro, asi que tambien se refrescan.
export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...changes }: { id: string; name?: string; color?: string }) =>
      apiRequest<{ category: Category }>(`/api/categories/${id}`, { method: 'PATCH', body: changes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/api/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
};
