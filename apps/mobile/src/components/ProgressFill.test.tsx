import { render, screen } from '@testing-library/react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { Duration, EASE_OUT_CSS } from '@/constants/motion';
import { ProgressFill } from './ProgressFill';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  // El export por defecto (Animated) no es enumerable: se copia a mano.
  return { ...actual, __esModule: true, default: actual.default, useReducedMotion: jest.fn(() => false) };
});

// Las propiedades de transicion las consume Reanimated y no llegan al View nativo: se leen en el elemento animado.
const style = () => Object.assign({}, ...[screen.UNSAFE_getByType(Animated.View).props.style].flat(Infinity).filter(Boolean));

describe('ProgressFill', () => {
  beforeEach(() => {
    jest.mocked(useReducedMotion).mockReturnValue(false);
  });

  it('mide su ancho como porcentaje de la proporcion y lleva el color', () => {
    render(<ProgressFill testID="fill" ratio={0.375} color="#4F5DFF" />);

    expect(style()).toMatchObject({ width: '37.5%', backgroundColor: '#4F5DFF' });
  });

  it('una proporcion de 0 es una barra vacia y de 1, una llena', () => {
    const { rerender } = render(<ProgressFill testID="fill" ratio={0} color="#000" />);
    expect(style().width).toBe('0%');

    rerender(<ProgressFill testID="fill" ratio={1} color="#000" />);
    expect(style().width).toBe('100%');
  });

  it('es absoluto y sin hijos: animar su ancho no recoloca nada mas', () => {
    render(<ProgressFill testID="fill" ratio={0.5} color="#000" />);

    expect(style()).toMatchObject({ position: 'absolute', left: 0, top: 0, bottom: 0 });
    expect(screen.getByTestId('fill').children).toHaveLength(0);
  });

  it('el ancho cambia con una transicion de 220 ms y la curva de salida', () => {
    render(<ProgressFill testID="fill" ratio={0.5} color="#000" />);

    expect(style()).toMatchObject({
      transitionProperty: 'width',
      transitionDuration: Duration.slide,
      transitionTimingFunction: EASE_OUT_CSS,
    });
  });

  it('con Reducir movimiento activado el ancho cambia de golpe', () => {
    jest.mocked(useReducedMotion).mockReturnValue(true);
    render(<ProgressFill testID="fill" ratio={0.5} color="#000" />);

    expect(style().transitionDuration).toBe(0);
  });
});
