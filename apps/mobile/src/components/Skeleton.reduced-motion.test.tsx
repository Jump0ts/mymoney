import { render, screen } from '@testing-library/react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { Skeleton } from './Skeleton';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  // El export por defecto (Animated) no es enumerable: se copia a mano.
  return { ...actual, __esModule: true, default: actual.default, useReducedMotion: jest.fn() };
});

// Las propiedades de animacion las consume Reanimated y no llegan al View nativo: se leen en el elemento animado.
const style = () => Object.assign({}, ...[screen.UNSAFE_getByType(Animated.View).props.style].flat(Infinity).filter(Boolean));

describe('Skeleton con Reducir movimiento activado', () => {
  it('no late: se queda quieto en opacidad estatica', () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);

    render(<Skeleton />);

    expect(style().opacity).toBe(0.5);
    expect(style().animationName).toBeUndefined();
  });

  it('con el movimiento normal late en bucle, subiendo y bajando', () => {
    jest.mocked(useReducedMotion).mockReturnValue(false);

    render(<Skeleton />);

    expect(style()).toMatchObject({
      animationName: { from: { opacity: 0.5 }, to: { opacity: 1 } },
      animationIterationCount: 'infinite',
      animationDirection: 'alternate',
      animationDuration: 700,
    });
  });
});
