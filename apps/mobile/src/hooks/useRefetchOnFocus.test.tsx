import { renderHook } from '@testing-library/react-native';
import { useFocusEffect } from 'expo-router';
import { useRefetchOnFocus } from './useRefetchOnFocus';

jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }));

// Simula al navegador: guarda el efecto que se registra y permite "dar foco" a mano.
const focus = () => {
  const effect = jest.mocked(useFocusEffect).mock.calls.at(-1)?.[0];
  effect?.();
};

beforeEach(() => {
  jest.mocked(useFocusEffect).mockClear();
});

describe('useRefetchOnFocus', () => {
  it('no vuelve a pedir los datos en el primer foco (la consulta ya se lanza al montar)', () => {
    const refetch = jest.fn();
    renderHook(() => useRefetchOnFocus(refetch));

    focus();

    expect(refetch).not.toHaveBeenCalled();
  });

  it('los pide de nuevo cada vez que la pestaña recupera el foco', () => {
    const refetch = jest.fn();
    renderHook(() => useRefetchOnFocus(refetch));

    focus();
    focus();
    focus();

    expect(refetch).toHaveBeenCalledTimes(2);
  });
});
