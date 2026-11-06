import { renderHook } from '@testing-library/react-native';

import { useColorScheme } from './use-color-scheme.web';

// Se sustituye el modulo de React Native que implementa el hook: copiar todo 'react-native' con jest.requireActual
// activa getters perezosos de modulos nativos que no existen en Jest.
jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({ __esModule: true, default: jest.fn() }));

const useRNColorScheme = jest.requireMock('react-native/Libraries/Utilities/useColorScheme').default as jest.Mock;

describe('useColorScheme (web)', () => {
  beforeEach(() => {
    useRNColorScheme.mockReturnValue('dark');
  });

  it('en el navegador devuelve el esquema real del sistema', () => {
    const { result } = renderHook(() => useColorScheme());

    expect(result.current).toBe('dark');
  });

  it('si el sistema no define esquema, en el navegador devuelve el valor tal cual', () => {
    useRNColorScheme.mockReturnValue('unspecified');

    const { result } = renderHook(() => useColorScheme());

    expect(result.current).toBe('unspecified');
  });
});
