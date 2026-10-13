import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { apiRequest } from '@/lib/api';
import type { BudgetMonthResponse } from './budgets.types';
import { budgetMonthKey, useToggleEntryPaid, useUpdateMonthIncome } from './useBudgets';

jest.mock('@/lib/api', () => ({ apiRequest: jest.fn() }));

const target = { year: 2026, month: 9 };

const seed = (): BudgetMonthResponse => ({
  month: { year: 2026, month: 9, income: '1000.00' },
  groups: [
    {
      id: 'g1',
      name: 'Hogar',
      color: '#4F5DFF',
      position: 0,
      entries: [
        {
          id: 'e1',
          groupId: 'g1',
          itemId: null,
          name: 'Netflix',
          amount: '21.99',
          kind: 'FIXED',
          categoryId: null,
          paid: false,
          position: 0,
          spent: null,
        },
      ],
    },
  ],
});

const setup = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(budgetMonthKey(target), seed());
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const paidInCache = () =>
    queryClient.getQueryData<BudgetMonthResponse>(budgetMonthKey(target))!.groups[0].entries[0].paid;
  return { queryClient, wrapper, paidInCache };
};

describe('useToggleEntryPaid', () => {
  beforeEach(() => jest.mocked(apiRequest).mockReset());

  it('marca la linea como pagada al instante, antes de que responda el servidor', async () => {
    const { wrapper, paidInCache } = setup();
    let resolveRequest: (value: unknown) => void = () => {};
    jest.mocked(apiRequest).mockReturnValue(new Promise((resolve) => (resolveRequest = resolve)));
    const { result } = renderHook(() => useToggleEntryPaid(target), { wrapper });

    act(() => result.current.mutate({ id: 'e1', paid: true }));

    await waitFor(() => expect(paidInCache()).toBe(true));
    expect(apiRequest).toHaveBeenCalledWith('/api/budgets/entries/e1', { method: 'PATCH', body: { paid: true } });

    await act(async () => resolveRequest({ entry: {} }));
  });

  it('deshace el cambio si el servidor lo rechaza', async () => {
    const { wrapper, paidInCache } = setup();
    jest.mocked(apiRequest).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useToggleEntryPaid(target), { wrapper });

    await act(async () => {
      result.current.mutate({ id: 'e1', paid: true });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(paidInCache()).toBe(false);
  });
});

describe('useUpdateMonthIncome', () => {
  beforeEach(() => jest.mocked(apiRequest).mockReset());

  it('guarda el sueldo y actualiza la cache con la respuesta del servidor', async () => {
    const { queryClient, wrapper } = setup();
    const updated: BudgetMonthResponse = { ...seed(), month: { year: 2026, month: 9, income: '1500.00' } };
    jest.mocked(apiRequest).mockResolvedValue(updated);
    const { result } = renderHook(() => useUpdateMonthIncome(target), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(1500);
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/budgets/months/2026/9', { method: 'PATCH', body: { income: 1500 } });
    expect(queryClient.getQueryData<BudgetMonthResponse>(budgetMonthKey(target))!.month!.income).toBe('1500.00');
  });
});
