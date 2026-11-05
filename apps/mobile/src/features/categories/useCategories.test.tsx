import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { ApiError, apiRequest } from '@/lib/api';
import { useUpdateCategory } from './useCategories';

jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiRequest: jest.fn() }));

const setup = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

beforeEach(() => jest.mocked(apiRequest).mockReset());

describe('useUpdateCategory', () => {
  it('manda solo lo que cambia a la categoria indicada', async () => {
    const { wrapper } = setup();
    jest.mocked(apiRequest).mockResolvedValue({ category: {} });
    const { result } = renderHook(() => useUpdateCategory(), { wrapper });

    await act(async () => {
      result.current.mutate({ id: 'cat-1', name: 'Cafeteria' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiRequest).toHaveBeenCalledWith('/api/categories/cat-1', { method: 'PATCH', body: { name: 'Cafeteria' } });
  });

  it('puede mandar nombre y color juntos, sin el id en el cuerpo', async () => {
    const { wrapper } = setup();
    jest.mocked(apiRequest).mockResolvedValue({ category: {} });
    const { result } = renderHook(() => useUpdateCategory(), { wrapper });

    await act(async () => {
      result.current.mutate({ id: 'cat-1', name: 'Cafeteria', color: '#E91E63' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiRequest).toHaveBeenCalledWith('/api/categories/cat-1', {
      method: 'PATCH',
      body: { name: 'Cafeteria', color: '#E91E63' },
    });
  });

  it('refresca categorias, movimientos, resumen y presupuesto: todos llevan el nombre y el color de la categoria', async () => {
    const { wrapper, queryClient } = setup();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    jest.mocked(apiRequest).mockResolvedValue({ category: {} });
    const { result } = renderHook(() => useUpdateCategory(), { wrapper });

    await act(async () => {
      result.current.mutate({ id: 'cat-1', color: '#E91E63' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = invalidate.mock.calls.map(([filters]) => (filters as { queryKey: string[] }).queryKey[0]);
    expect(keys.sort()).toEqual(['budgets', 'categories', 'summary', 'transactions']);
  });

  it('si el servidor lo rechaza queda en error y no refresca nada', async () => {
    const { wrapper, queryClient } = setup();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    jest.mocked(apiRequest).mockRejectedValue(new ApiError(400, 'Ya existe una categoría con ese nombre y tipo'));
    const { result } = renderHook(() => useUpdateCategory(), { wrapper });

    await act(async () => {
      result.current.mutate({ id: 'cat-1', name: 'Te' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
  });
});
