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

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/api/categories/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
};
