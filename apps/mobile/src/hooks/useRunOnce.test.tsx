import { renderHook } from '@testing-library/react-native';
import { StrictMode } from 'react';

import { useRunOnce } from './useRunOnce';

describe('useRunOnce', () => {
  it('ejecuta la funcion al montar', () => {
    const run = jest.fn();

    renderHook(() => useRunOnce(run));

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('no la repite al volver a pintar', () => {
    const run = jest.fn();
    const { rerender } = renderHook(() => useRunOnce(run));

    rerender({});
    rerender({});

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('ni siquiera en modo estricto, donde React repite los efectos al montar', () => {
    const run = jest.fn();

    renderHook(() => useRunOnce(run), { wrapper: StrictMode });

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('no vuelve a ejecutarla aunque cambie la funcion (la sesion no se lee dos veces)', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = renderHook(({ run }: { run: () => void }) => useRunOnce(run), { initialProps: { run: first } });

    rerender({ run: second });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).not.toHaveBeenCalled();
  });
});
