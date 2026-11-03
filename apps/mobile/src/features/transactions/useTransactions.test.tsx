import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { apiRequest } from '@/lib/api';
import { useCreateTransaction, useDeleteTransaction, useUpdateTransaction } from './useTransactions';

jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiRequest: jest.fn() }));

const setup = () => {
  // gcTime infinito: sin temporizadores de limpieza que mantengan vivo el proceso de jest tras los tests.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } },
  });
  const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, invalidate };
};

const invalidatedKeys = (invalidate: jest.SpyInstance) =>
  invalidate.mock.calls.map(([filters]) => (filters as { queryKey: unknown[] }).queryKey[0]);

beforeEach(() => {
  jest.mocked(apiRequest).mockReset().mockResolvedValue({});
});

// Enlazar, desenlazar o borrar un gasto cambia lo pagado en el presupuesto: tiene que refrescarse tambien.
describe('movimientos y presupuesto', () => {
  it('crear un movimiento refresca la lista, el resumen y el presupuesto', async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useCreateTransaction(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        categoryId: 'c1',
        type: 'EXPENSE',
        amount: 10,
        occurredAt: '2026-10-12T10:00:00.000Z',
        budgetEntryId: 'entry-1',
      });
    });

    expect(invalidatedKeys(invalidate)).toEqual(expect.arrayContaining(['transactions', 'summary', 'budgets']));
    expect(apiRequest).toHaveBeenCalledWith(
      '/api/transactions',
      expect.objectContaining({ method: 'POST', body: expect.objectContaining({ budgetEntryId: 'entry-1' }) }),
    );
  });

  it('editar manda el id por la URL y el enlace en el cuerpo (null lo quita), y refresca el presupuesto', async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useUpdateTransaction(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 'tx-1', budgetEntryId: null });
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/transactions/tx-1', { method: 'PATCH', body: { budgetEntryId: null } });
    expect(invalidatedKeys(invalidate)).toContain('budgets');
  });

  it('borrar un movimiento refresca el presupuesto', async () => {
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useDeleteTransaction(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync('tx-1');
    });

    await waitFor(() => expect(invalidatedKeys(invalidate)).toContain('budgets'));
  });
});
