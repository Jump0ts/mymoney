import { renderHook } from '@testing-library/react-native';

import { Colors } from '@/constants/theme';
import { contrastRatio, MIN_VISIBLE_CONTRAST } from '@/utils/color';
import { useLegibleColor } from './use-legible-color';

let mockScheme: 'light' | 'dark' = 'light';

jest.mock('@/hooks/use-color-scheme', () => ({ useColorScheme: () => mockScheme }));

afterEach(() => {
  mockScheme = 'light';
});

describe('useLegibleColor', () => {
  it('deja igual un color que se distingue de la tarjeta', () => {
    const { result } = renderHook(() => useLegibleColor());

    expect(result.current('#4F5DFF')).toBe('#4F5DFF');
  });

  it('en modo claro oscurece un casi blanco hasta que se vea sobre la tarjeta blanca', () => {
    const { result } = renderHook(() => useLegibleColor());

    const adjusted = result.current('#FAFAF0');

    expect(adjusted).not.toBe('#FAFAF0');
    expect(contrastRatio(adjusted, Colors.light.backgroundElement)).toBeGreaterThanOrEqual(MIN_VISIBLE_CONTRAST);
  });

  it('en modo oscuro aclara un casi negro hasta que se vea sobre la tarjeta oscura', () => {
    mockScheme = 'dark';
    const { result } = renderHook(() => useLegibleColor());

    const adjusted = result.current('#0A0A10');

    expect(adjusted).not.toBe('#0A0A10');
    expect(contrastRatio(adjusted, Colors.dark.backgroundElement)).toBeGreaterThanOrEqual(MIN_VISIBLE_CONTRAST);
  });

  it('el mismo casi blanco no se toca en modo oscuro, donde ya se ve', () => {
    mockScheme = 'dark';
    const { result } = renderHook(() => useLegibleColor());

    expect(result.current('#FAFAF0')).toBe('#FAFAF0');
  });

  it('cambiar de modo cambia el resultado (el ajuste sigue al tema)', () => {
    const { result, rerender } = renderHook(() => useLegibleColor());
    const light = result.current('#101010');

    mockScheme = 'dark';
    rerender({});

    expect(light).toBe('#101010');
    expect(result.current('#101010')).not.toBe('#101010');
  });
});
