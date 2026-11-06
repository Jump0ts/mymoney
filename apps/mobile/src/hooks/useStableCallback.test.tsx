import { renderHook } from '@testing-library/react-native';

import { useStableCallback } from './useStableCallback';

describe('useStableCallback', () => {
  it('devuelve una funcion con la misma identidad en todos los renders', () => {
    const { result, rerender } = renderHook(({ value }: { value: number }) => useStableCallback(() => value), {
      initialProps: { value: 1 },
    });
    const first = result.current;

    rerender({ value: 2 });
    rerender({ value: 3 });

    expect(result.current).toBe(first);
  });

  it('siempre llama a la ultima version de la funcion (no se queda con valores viejos)', () => {
    const { result, rerender } = renderHook(({ value }: { value: number }) => useStableCallback(() => value), {
      initialProps: { value: 1 },
    });
    const stable = result.current;
    expect(stable()).toBe(1);

    rerender({ value: 2 });

    expect(stable()).toBe(2);
  });

  it('pasa los argumentos y devuelve el resultado', () => {
    const { result } = renderHook(() => useStableCallback((a: number, b: number) => a + b));

    expect(result.current(2, 3)).toBe(5);
  });

  it('llama a la funcion nueva y no a la anterior', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { result, rerender } = renderHook(({ callback }: { callback: () => void }) => useStableCallback(callback), {
      initialProps: { callback: first },
    });

    rerender({ callback: second });
    result.current();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
