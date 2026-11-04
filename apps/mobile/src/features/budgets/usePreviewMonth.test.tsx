import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { apiRequest } from '@/lib/api';
import type { BudgetEntry, BudgetMonthResponse } from './budgets.types';
import { usePreviewMonth } from './usePreviewMonth';
import { budgetMonthKey } from './useBudgets';

jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiRequest: jest.fn() }));

const target = { year: 2027, month: 1 };

const entry = (id: string, itemId: string | null): BudgetEntry => ({
  id,
  groupId: 'g1',
  itemId,
  name: 'Seguro',
  amount: '380.00',
  paid: false,
  position: 0,
});

const month = (preview: boolean, entries: BudgetEntry[]): BudgetMonthResponse => ({
  preview,
  month: { year: 2027, month: 1, income: '1500.00' },
  groups: [{ id: 'g1', name: 'Coche', color: '#4F5DFF', limit: null, isRemainder: false, position: 0, entries }],
});

const setup = (data: BudgetMonthResponse | undefined) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { gcTime: Infinity } },
  });
  if (data) queryClient.setQueryData(budgetMonthKey(target), data);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => usePreviewMonth(target, data), { wrapper });
};

describe('usePreviewMonth', () => {
  beforeEach(() => jest.mocked(apiRequest).mockReset());

  it('indica si el mes es una vista previa', () => {
    expect(setup(month(true, [])).result.current.isPreview).toBe(true);
    expect(setup(month(false, [])).result.current.isPreview).toBe(false);
    expect(setup(undefined).result.current.isPreview).toBe(false);
    // Sin el campo (respuestas antiguas o de otros meses) se trata como un mes guardado.
    expect(setup({ ...month(false, []), preview: undefined }).result.current.isPreview).toBe(false);
  });

  it('ensureSaved guarda el mes cuando es vista previa', async () => {
    jest.mocked(apiRequest).mockResolvedValue(month(false, []));
    const { result } = setup(month(true, []));

    await act(async () => {
      await result.current.ensureSaved();
    });

    expect(apiRequest).toHaveBeenCalledWith('/api/budgets/months/2027/1/open', { method: 'POST' });
  });

  it('ensureSaved no llama al servidor si el mes ya estaba guardado', async () => {
    const { result } = setup(month(false, []));

    await act(async () => {
      await result.current.ensureSaved();
    });

    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('ensureSaved propaga el fallo del servidor', async () => {
    jest.mocked(apiRequest).mockRejectedValue(new Error('sin conexion'));
    const { result } = setup(month(true, []));

    await act(async () => {
      await expect(result.current.ensureSaved()).rejects.toThrow('sin conexion');
    });
  });

  it('resolveEntryId devuelve el id de siempre si el mes ya estaba guardado, sin llamar al servidor', async () => {
    const { result } = setup(month(false, [entry('e1', 'i1')]));

    let id: string | null = null;
    await act(async () => {
      id = await result.current.resolveEntryId(entry('e1', 'i1'));
    });

    expect(id).toBe('e1');
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('resolveEntryId guarda el mes y devuelve el id real de la linea equivalente por su plantilla', async () => {
    jest.mocked(apiRequest).mockResolvedValue(month(false, [entry('real-1', 'i1'), entry('real-2', 'i2')]));
    const { result } = setup(month(true, [entry('preview:i2', 'i2')]));

    let id: string | null = null;
    await act(async () => {
      id = await result.current.resolveEntryId(entry('preview:i2', 'i2'));
    });

    expect(id).toBe('real-2');
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  it('resolveEntryId devuelve null si la linea ya no esta al guardar el mes', async () => {
    jest.mocked(apiRequest).mockResolvedValue(month(false, [entry('real-1', 'i1')]));
    const { result } = setup(month(true, [entry('preview:i9', 'i9')]));

    let id: string | null = 'x';
    await act(async () => {
      id = await result.current.resolveEntryId(entry('preview:i9', 'i9'));
    });

    expect(id).toBeNull();
  });
});
