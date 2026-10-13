import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import type { YearMonth } from '@/utils/date';
import type { BudgetEntry, BudgetMonthResponse } from './budgets.types';
import { setEntryPaid } from './budgets.utils';

export const budgetMonthKey = ({ year, month }: YearMonth) => ['budgets', 'month', year, month] as const;

export const useBudgetMonth = (target: YearMonth) =>
  useQuery({
    queryKey: budgetMonthKey(target),
    queryFn: () => apiRequest<BudgetMonthResponse>(`/api/budgets/months/${target.year}/${target.month}`),
  });

// El check se refleja al instante (los totales se recalculan en cliente) y se
// deshace si el servidor lo rechaza.
export const useToggleEntryPaid = (target: YearMonth) => {
  const queryClient = useQueryClient();
  const key = budgetMonthKey(target);

  return useMutation({
    mutationFn: ({ id, paid }: { id: string; paid: boolean }) =>
      apiRequest<{ entry: BudgetEntry }>(`/api/budgets/entries/${id}`, { method: 'PATCH', body: { paid } }),
    onMutate: async ({ id, paid }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<BudgetMonthResponse>(key);
      if (previous) queryClient.setQueryData<BudgetMonthResponse>(key, setEntryPaid(previous, id, paid));
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
};

export const useUpdateMonthIncome = (target: YearMonth) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (income: number) =>
      apiRequest<BudgetMonthResponse>(`/api/budgets/months/${target.year}/${target.month}`, {
        method: 'PATCH',
        body: { income },
      }),
    onSuccess: (data) => queryClient.setQueryData(budgetMonthKey(target), data),
  });
};
