import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { ApiError, apiRequest } from '@/lib/api';
import type { BudgetEntry, BudgetMonthResponse } from './budgets.types';
import {
  budgetMonthKey,
  useCreateEntry,
  useCreateGroup,
  useDeleteEntry,
  useDeleteGroup,
  useMoveInBudget,
  useToggleEntryPaid,
  useUpdateEntry,
  useUpdateGroup,
  useUpdateMonthIncome,
} from './useBudgets';

jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiRequest: jest.fn() }));

// gcTime infinito: sin temporizadores de limpieza que mantengan vivo el proceso de jest tras los tests.
const target = { year: 2026, month: 9 };

const seed = (): BudgetMonthResponse => ({
  month: { year: 2026, month: 9, income: '1000.00' },
  groups: [
    {
      id: 'g1',
      name: 'Hogar',
      color: '#4F5DFF',
      limit: null,
      isRemainder: false,
      position: 0,
      entries: [
        {
          id: 'e1',
          groupId: 'g1',
          itemId: null,
          name: 'Netflix',
          amount: '21.99',
          paid: false,
          position: 0,
        },
      ],
    },
  ],
});

const setup = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } },
  });
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

const entry = (overrides: Partial<BudgetEntry> = {}): BudgetEntry => ({
  id: 'e1',
  groupId: 'g1',
  itemId: 'i1',
  name: 'Netflix',
  amount: '21.99',
  paid: false,
  position: 0,
  ...overrides,
});

const fixedLine = { name: 'Netflix HD', amount: 25 } as const;

describe('useUpdateEntry', () => {
  beforeEach(() => jest.mocked(apiRequest).mockReset().mockResolvedValue({}));

  it('con alcance "month" solo cambia la linea del mes', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useUpdateEntry(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ entry: entry(), line: fixedLine, scope: 'month' });
    });

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith('/api/budgets/entries/e1', {
      method: 'PATCH',
      body: { name: 'Netflix HD', amount: 25 },
    });
  });

  it('con alcance "template" cambia tambien el item de la plantilla', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useUpdateEntry(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ entry: entry(), line: fixedLine, scope: 'template' });
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/budgets/items/i1', {
      method: 'PATCH',
      body: { name: 'Netflix HD', amount: 25 },
    });
  });

  it('una linea puntual (sin item) no toca la plantilla aunque se pida', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useUpdateEntry(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ entry: entry({ itemId: null }), line: fixedLine, scope: 'template' });
    });

    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  it('si la plantilla ya no tiene el item (404) el cambio del mes cuenta como hecho', async () => {
    const { wrapper } = setup();
    jest.mocked(apiRequest).mockResolvedValueOnce({}).mockRejectedValueOnce(new ApiError(404, 'Línea no encontrada'));
    const { result } = renderHook(() => useUpdateEntry(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ entry: entry(), line: fixedLine, scope: 'template' });
    });

    expect(apiRequest).toHaveBeenCalledTimes(2);
  });
});

describe('useDeleteEntry', () => {
  beforeEach(() => jest.mocked(apiRequest).mockReset().mockResolvedValue(undefined));

  it('con alcance "month" solo quita la linea del mes', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useDeleteEntry(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ entry: entry(), scope: 'month' });
    });

    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(apiRequest).toHaveBeenCalledWith('/api/budgets/entries/e1', { method: 'DELETE' });
  });

  it('con alcance "template" quita tambien el item de la plantilla', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useDeleteEntry(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ entry: entry(), scope: 'template' });
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/budgets/items/i1', { method: 'DELETE' });
  });

  it('con alcance "template" quita primero el item y despues la linea', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useDeleteEntry(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ entry: entry(), scope: 'template' });
    });

    expect(jest.mocked(apiRequest).mock.calls.map(([url]) => url)).toEqual([
      '/api/budgets/items/i1',
      '/api/budgets/entries/e1',
    ]);
  });

  it('si falla a medias se puede reintentar hasta terminar (un 404 cuenta como hecho)', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useDeleteEntry(), { wrapper });

    // 1.er intento: el item se borra pero la linea del mes falla.
    jest
      .mocked(apiRequest)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ApiError(500, 'Error de red'));
    await act(async () => {
      await expect(result.current.mutateAsync({ entry: entry(), scope: 'template' })).rejects.toThrow();
    });

    // 2.o intento: el item ya no existe (404) y la linea se borra.
    jest
      .mocked(apiRequest)
      .mockRejectedValueOnce(new ApiError(404, 'Línea no encontrada'))
      .mockResolvedValueOnce(undefined);
    await act(async () => {
      await result.current.mutateAsync({ entry: entry(), scope: 'template' });
    });

    expect(apiRequest).toHaveBeenLastCalledWith('/api/budgets/entries/e1', { method: 'DELETE' });
  });

  it('refresca el presupuesto aunque falle, para no dejar la pantalla desfasada', async () => {
    const { queryClient, wrapper } = setup();
    jest.mocked(apiRequest).mockRejectedValue(new ApiError(500, 'Error de red'));
    const { result } = renderHook(() => useDeleteEntry(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ entry: entry(), scope: 'month' })).rejects.toThrow();
    });

    expect(queryClient.getQueryState(budgetMonthKey(target))?.isInvalidated).toBe(true);
  });

  it('un error distinto de 404 se propaga', async () => {
    const { wrapper } = setup();
    jest.mocked(apiRequest).mockRejectedValue(new ApiError(400, 'Petición inválida'));
    const { result } = renderHook(() => useDeleteEntry(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ entry: entry(), scope: 'month' })).rejects.toThrow('Petición inválida');
    });
  });
});

describe('useCreateEntry', () => {
  beforeEach(() => jest.mocked(apiRequest).mockReset().mockResolvedValue({}));

  it.each([
    ['template', true],
    ['month', false],
  ] as const)('con alcance "%s" envia recurring=%s', async (scope, recurring) => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useCreateEntry(target), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ groupId: 'g1', line: fixedLine, scope });
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/budgets/months/2026/9/entries', {
      method: 'POST',
      body: { groupId: 'g1', ...fixedLine, recurring },
    });
  });
});

describe('grupos', () => {
  beforeEach(() => jest.mocked(apiRequest).mockReset().mockResolvedValue({}));

  it('crea, edita y borra un grupo', async () => {
    const { wrapper } = setup();
    const create = renderHook(() => useCreateGroup(), { wrapper });
    const update = renderHook(() => useUpdateGroup(), { wrapper });
    const remove = renderHook(() => useDeleteGroup(), { wrapper });

    await act(async () => {
      await create.result.current.mutateAsync({ name: 'Hogar', color: '#4F5DFF', limit: 600, isRemainder: false });
      await update.result.current.mutateAsync({ id: 'g1', name: 'Casa', color: '#4F5DFF', limit: null, isRemainder: false });
      await remove.result.current.mutateAsync('g1');
    });

    expect(apiRequest).toHaveBeenNthCalledWith(1, '/api/budgets/groups', {
      method: 'POST',
      body: { name: 'Hogar', color: '#4F5DFF', limit: 600, isRemainder: false },
    });
    expect(apiRequest).toHaveBeenNthCalledWith(2, '/api/budgets/groups/g1', {
      method: 'PATCH',
      body: { name: 'Casa', color: '#4F5DFF', limit: null, isRemainder: false },
    });
    expect(apiRequest).toHaveBeenNthCalledWith(3, '/api/budgets/groups/g1', { method: 'DELETE' });
  });

  it('refresca el presupuesto tras guardar', async () => {
    const { queryClient, wrapper } = setup();
    const { result } = renderHook(() => useCreateGroup(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ name: 'Hogar', color: '#4F5DFF', limit: null, isRemainder: false });
    });

    expect(queryClient.getQueryState(budgetMonthKey(target))?.isInvalidated).toBe(true);
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

describe('useMoveInBudget', () => {
  const entryOf = (id: string, name: string) => ({
    id,
    groupId: 'g1',
    itemId: null,
    name,
    amount: '10.00',
    paid: false,
    position: 0,
  });

  const orderSeed = (): BudgetMonthResponse => ({
    month: { year: 2026, month: 9, income: '1000.00' },
    groups: [
      { id: 'g1', name: 'Hogar', color: '#4F5DFF', limit: null, isRemainder: false, position: 0, entries: [entryOf('a', 'A'), entryOf('b', 'B'), entryOf('c', 'C')] },
      { id: 'g2', name: 'Ocio', color: '#E5484D', limit: null, isRemainder: false, position: 1, entries: [] },
    ],
  });

  const setupOrder = () => {
    const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } },
  });
    queryClient.setQueryData(budgetMonthKey(target), orderSeed());
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const cache = () => queryClient.getQueryData<BudgetMonthResponse>(budgetMonthKey(target))!;
    return { queryClient, wrapper, cache };
  };

  beforeEach(() => jest.mocked(apiRequest).mockReset().mockResolvedValue(undefined));

  it('mueve un grupo al instante y manda el orden completo al servidor', async () => {
    const { wrapper, cache } = setupOrder();
    const { result } = renderHook(() => useMoveInBudget(target), { wrapper });

    act(() => result.current.moveGroup('g2', -1));

    expect(cache().groups.map((g) => g.id)).toEqual(['g2', 'g1']);
    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith('/api/budgets/groups/order', {
        method: 'PUT',
        body: { ids: ['g2', 'g1'] },
      }),
    );
  });

  it('mueve una linea dentro de su grupo en el mes abierto', async () => {
    const { wrapper, cache } = setupOrder();
    const { result } = renderHook(() => useMoveInBudget(target), { wrapper });

    await act(async () => result.current.moveEntry('g1', 'c', -1));

    expect(cache().groups[0].entries.map((e) => e.id)).toEqual(['a', 'c', 'b']);
    expect(apiRequest).toHaveBeenCalledWith('/api/budgets/months/2026/9/groups/g1/entries/order', {
      method: 'PUT',
      body: { ids: ['a', 'c', 'b'] },
    });
  });

  it('varios toques seguidos se suman partiendo de lo que ya se ve', async () => {
    const { wrapper, cache } = setupOrder();
    const { result } = renderHook(() => useMoveInBudget(target), { wrapper });

    act(() => {
      result.current.moveEntry('g1', 'c', -1);
      result.current.moveEntry('g1', 'c', -1);
    });

    expect(cache().groups[0].entries.map((e) => e.id)).toEqual(['c', 'a', 'b']);
    await waitFor(() =>
      expect(apiRequest).toHaveBeenLastCalledWith(expect.any(String), { method: 'PUT', body: { ids: ['c', 'a', 'b'] } }),
    );
  });

  it('en el limite de la lista no hace nada', async () => {
    const { wrapper, cache } = setupOrder();
    const { result } = renderHook(() => useMoveInBudget(target), { wrapper });

    await act(async () => {
      result.current.moveEntry('g1', 'a', -1);
      result.current.moveGroup('g2', 1);
    });

    expect(cache().groups[0].entries.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    expect(cache().groups.map((g) => g.id)).toEqual(['g1', 'g2']);
  });

  it('deshace el cambio y avisa si el servidor lo rechaza', async () => {
    const { wrapper, cache } = setupOrder();
    jest.mocked(apiRequest).mockRejectedValue(new ApiError(500, 'Error'));
    const onError = jest.fn();
    const { result } = renderHook(() => useMoveInBudget(target), { wrapper });

    await act(async () => result.current.moveGroup('g2', -1, onError));

    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(cache().groups.map((g) => g.id)).toEqual(['g1', 'g2']);
  });

  it('refresca el presupuesto al terminar', async () => {
    const { queryClient, wrapper } = setupOrder();
    const { result } = renderHook(() => useMoveInBudget(target), { wrapper });

    await act(async () => result.current.moveGroup('g2', -1));

    await waitFor(() => expect(queryClient.getQueryState(budgetMonthKey(target))?.isInvalidated).toBe(true));
  });
});
