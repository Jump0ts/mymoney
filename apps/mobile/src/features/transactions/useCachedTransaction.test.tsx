import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { useCachedTransaction } from './useTransactions';
import type { Transaction, TransactionsPage } from './transactions.types';

const transaction: Transaction = {
  id: 'tx-1',
  type: 'EXPENSE',
  amount: '20.00',
  currency: 'EUR',
  description: 'Edit flow test',
  occurredAt: '2026-09-23T10:00:00.000Z',
  category: { id: 'cat-1', name: 'Alimentación', icon: 'shopping-cart', color: '#E67E22', type: 'EXPENSE' },
};

const page: TransactionsPage = {
  transactions: [transaction],
  pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
};

const renderWithClient = (id: string | undefined, seed = true) => {
  const queryClient = new QueryClient();
  if (seed) {
    queryClient.setQueryData(['transactions', { page: 1 }], page);
  }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useCachedTransaction(id), { wrapper });
};

describe('useCachedTransaction', () => {
  it('encuentra el movimiento en cualquier pagina cacheada de /transactions', () => {
    const { result } = renderWithClient('tx-1');
    expect(result.current).toEqual(transaction);
  });

  it('devuelve undefined si el id no esta en ninguna pagina cacheada', () => {
    const { result } = renderWithClient('tx-does-not-exist');
    expect(result.current).toBeUndefined();
  });

  it('devuelve undefined si no hay nada en cache (enlace directo, cache vacia)', () => {
    const { result } = renderWithClient('tx-1', false);
    expect(result.current).toBeUndefined();
  });

  it('devuelve undefined si no se pasa id', () => {
    const { result } = renderWithClient(undefined);
    expect(result.current).toBeUndefined();
  });
});
