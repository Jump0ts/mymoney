import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { ApiError, apiRequest } from '@/lib/api';
import type { SavedColor } from './colors.types';
import { useRemoveColor, useSavedColors, useSaveColor } from './useColors';

jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiRequest: jest.fn() }));

const color = (hex: string, id = `id-${hex}`): SavedColor => ({ id, hex, createdAt: '2026-11-04T10:00:00.000Z' });

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

describe('useSavedColors', () => {
  it('pide los colores propios y devuelve la lista, sin el sobre de la respuesta', async () => {
    const { wrapper } = setup();
    jest.mocked(apiRequest).mockResolvedValue({ colors: [color('#E91E63'), color('#101010')] });

    const { result } = renderHook(() => useSavedColors(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiRequest).toHaveBeenCalledWith('/api/colors');
    expect(result.current.data?.map((c) => c.hex)).toEqual(['#E91E63', '#101010']);
  });

  it('si falla no rompe: no hay datos y el campo de color sigue con la paleta', async () => {
    const { wrapper } = setup();
    jest.mocked(apiRequest).mockRejectedValue(new ApiError(500, 'boom'));

    const { result } = renderHook(() => useSavedColors(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});

describe('useSaveColor', () => {
  it('manda el color al servidor y vuelve a pedir la lista', async () => {
    const { wrapper, queryClient } = setup();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    jest.mocked(apiRequest).mockResolvedValue({ color: color('#E91E63') });
    const { result } = renderHook(() => useSaveColor(), { wrapper });

    await act(async () => {
      result.current.mutate('#E91E63');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiRequest).toHaveBeenCalledWith('/api/colors', { method: 'POST', body: { hex: '#E91E63' } });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['colors'] });
  });

  it('si el servidor lo rechaza (p. ej. lista llena) lo deja en error y no refresca', async () => {
    const { wrapper, queryClient } = setup();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    jest.mocked(apiRequest).mockRejectedValue(new ApiError(400, 'Ya tienes 24 colores guardados'));
    const { result } = renderHook(() => useSaveColor(), { wrapper });

    await act(async () => {
      result.current.mutate('#E91E63');
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe('useRemoveColor', () => {
  it('borra el color por su id y vuelve a pedir la lista', async () => {
    const { wrapper, queryClient } = setup();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    jest.mocked(apiRequest).mockResolvedValue(undefined);
    const { result } = renderHook(() => useRemoveColor(), { wrapper });

    await act(async () => {
      result.current.mutate('abc');
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(apiRequest).toHaveBeenCalledWith('/api/colors/abc', { method: 'DELETE' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['colors'] });
  });
});
