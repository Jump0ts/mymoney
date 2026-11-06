import { act, renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';

import { ApiError } from '@/lib/api';
import { confirmHaptic } from '@/lib/haptics';
import { usePayEntry } from './usePayEntry';

const mockMutate = jest.fn();
let mockPending = false;

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));
jest.mock('@/lib/haptics', () => ({ confirmHaptic: jest.fn() }));
jest.mock('@/features/transactions/useTransactions', () => ({
  useCreateTransaction: () => ({ mutate: mockMutate, isPending: mockPending }),
}));

const params = { entryId: 'e1', name: 'Netflix' };
const values = { categoryId: 'cat-ocio', amount: '21,99' };

const submit = (hook: ReturnType<typeof renderHook<ReturnType<typeof usePayEntry>, unknown>>) =>
  act(() => hook.result.current.handleSubmit(values));

type Callbacks = { onSuccess: () => void; onError: (err: unknown) => void };
const callbacks = () => mockMutate.mock.calls[0][1] as Callbacks;

describe('usePayEntry', () => {
  beforeEach(() => {
    mockMutate.mockClear();
    mockPending = false;
    jest.mocked(router.back).mockClear();
    jest.mocked(confirmHaptic).mockClear();
  });

  it('crea el movimiento enlazado a la linea con lo que se confirmo', () => {
    const hook = renderHook(() => usePayEntry(params));

    submit(hook);

    expect(mockMutate.mock.calls[0][0]).toMatchObject({ type: 'EXPENSE', amount: 21.99, budgetEntryId: 'e1' });
  });

  it('en un reembolso lo manda como un gasto de importe negativo', () => {
    const hook = renderHook(() => usePayEntry({ ...params, refund: '1' }));

    submit(hook);

    expect(mockMutate.mock.calls[0][0]).toMatchObject({ type: 'EXPENSE', amount: -21.99 });
  });

  it('cuando el servidor lo acepta vibra una vez y cierra la hoja', () => {
    const hook = renderHook(() => usePayEntry(params));
    submit(hook);

    act(() => callbacks().onSuccess());

    expect(confirmHaptic).toHaveBeenCalledTimes(1);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('no vibra ni cierra antes de que el servidor responda', () => {
    const hook = renderHook(() => usePayEntry(params));

    submit(hook);

    expect(confirmHaptic).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('si el servidor lo rechaza muestra su mensaje, deja la hoja abierta y no vibra', () => {
    const hook = renderHook(() => usePayEntry(params));
    submit(hook);

    act(() => callbacks().onError(new ApiError(409, 'Esa línea ya está enlazada a otro movimiento')));

    expect(hook.result.current.submitError).toBe('Esa línea ya está enlazada a otro movimiento');
    expect(confirmHaptic).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('un fallo que no es del servidor dice "Error inesperado"', () => {
    const hook = renderHook(() => usePayEntry(params));
    submit(hook);

    act(() => callbacks().onError(new Error('sin red')));

    expect(hook.result.current.submitError).toBe('Error inesperado');
  });

  it('al volver a confirmar se quita el error anterior', () => {
    const hook = renderHook(() => usePayEntry(params));
    submit(hook);
    act(() => callbacks().onError(new Error('x')));
    expect(hook.result.current.submitError).toBe('Error inesperado');

    submit(hook);

    expect(hook.result.current.submitError).toBeNull();
  });

  it('expone si se esta enviando', () => {
    mockPending = true;

    const hook = renderHook(() => usePayEntry(params));

    expect(hook.result.current.isSubmitting).toBe(true);
  });
});
