import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { drag } from '@/testing/drag';
import { ColorArea } from './ColorArea';

const layout = (width = 200, height = 100) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height } } });

const setup = (props: Partial<React.ComponentProps<typeof ColorArea>> = {}) => {
  const onChange = jest.fn();
  render(<ColorArea hue={240} saturation={0.5} value={0.5} onChange={onChange} {...props} />);
  fireEvent(screen.getByTestId('color-area'), 'layout', layout());
  return { onChange, area: screen.getByTestId('color-area') };
};

describe('ColorArea', () => {
  it('tocar un punto da su saturacion (hacia la derecha) y su brillo (hacia arriba)', async () => {
    const { onChange } = setup();

    await drag('color-area-pan', [[50, 20]]);

    expect(onChange).toHaveBeenLastCalledWith({ s: 0.25, v: 0.8 });
  });

  it('arrastrar sigue al dedo', async () => {
    const { onChange } = setup();

    await drag('color-area-pan', [[10, 90], [150, 30]]);

    expect(onChange).toHaveBeenNthCalledWith(1, { s: 0.05, v: expect.closeTo(0.1) });
    expect(onChange).toHaveBeenNthCalledWith(2, { s: 0.75, v: 0.7 });
  });

  it('las esquinas son los extremos y lo que cae fuera se recorta', async () => {
    const { onChange } = setup();

    await drag('color-area-pan', [[200, 0]]);
    expect(onChange).toHaveBeenLastCalledWith({ s: 1, v: 1 });

    await drag('color-area-pan', [[-30, 400]]);
    expect(onChange).toHaveBeenLastCalledWith({ s: 0, v: 0 });
  });

  it('antes de medirse no hace nada raro (tamano 0)', async () => {
    const onChange = jest.fn();
    render(<ColorArea hue={0} saturation={0} value={0} onChange={onChange} />);

    await drag('color-area-pan', [[10, 10]]);

    expect(onChange).toHaveBeenLastCalledWith({ s: 0, v: 0 });
  });

  it('el tirador esta donde dicen la saturacion y el brillo', async () => {
    setup({ saturation: 0.25, value: 0.75 });

    // x = 0.25 * 200, y = (1 - 0.75) * 100, menos la mitad del tirador (28 / 2).
    // El tirador se coloca en un efecto: Reanimated lo aplica en el siguiente frame, asi que se espera.
    await waitFor(() =>
      expect(screen.getByTestId('color-area-thumb')).toHaveAnimatedStyle({
        transform: [{ translateX: 50 - 14 }, { translateY: 25 - 14 }],
      }),
    );
  });

  it('al arrastrar, el tirador va donde esta el dedo (recortado a los bordes) sin esperar al valor', async () => {
    setup({ saturation: 0, value: 0 });

    await drag('color-area-pan', [[120, 40]]);
    expect(screen.getByTestId('color-area-thumb')).toHaveAnimatedStyle({
      transform: [{ translateX: 120 - 14 }, { translateY: 40 - 14 }],
    });

    await drag('color-area-pan', [[999, -50]]);
    expect(screen.getByTestId('color-area-thumb')).toHaveAnimatedStyle({
      transform: [{ translateX: 200 - 14 }, { translateY: 0 - 14 }],
    });
  });

  it('si el valor cambia por otro camino (el campo del codigo) el tirador se recoloca', async () => {
    const onChange = jest.fn();
    const { rerender } = render(<ColorArea hue={240} saturation={0.5} value={0.5} onChange={onChange} />);
    fireEvent(screen.getByTestId('color-area'), 'layout', layout());

    rerender(<ColorArea hue={240} saturation={1} value={1} onChange={onChange} />);

    // El tirador se coloca en un efecto: se espera a que Reanimated lo aplique.
    await act(async () => {});
    expect(screen.getByTestId('color-area-thumb')).toHaveAnimatedStyle({
      transform: [{ translateX: 200 - 14 }, { translateY: 0 - 14 }],
    });
  });

  it('ignora una coordenada que no es un numero en vez de pintar un color negro', async () => {
    const { onChange } = setup();

    await drag('color-area-pan', [[Number.NaN, 20]]);
    await drag('color-area-pan', [[50, Number.NaN]]);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('no avisa dos veces de la misma posicion', async () => {
    const { onChange } = setup();

    await drag('color-area-pan', [[50, 20], [50, 20], [60, 20]]);

    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('los lectores de pantalla pueden mover saturacion y brillo con acciones', () => {
    const { onChange, area } = setup({ saturation: 0.5, value: 0.5 });

    fireEvent(area, 'accessibilityAction', { nativeEvent: { actionName: 'moreSaturation' } });
    fireEvent(area, 'accessibilityAction', { nativeEvent: { actionName: 'lessSaturation' } });
    fireEvent(area, 'accessibilityAction', { nativeEvent: { actionName: 'brighter' } });
    fireEvent(area, 'accessibilityAction', { nativeEvent: { actionName: 'darker' } });

    expect(onChange.mock.calls.map(([arg]) => [Math.round(arg.s * 100), Math.round(arg.v * 100)])).toEqual([
      [55, 50],
      [45, 50],
      [50, 55],
      [50, 45],
    ]);
  });

  it('las acciones no se pasan de 0 ni de 1', () => {
    const { onChange, area } = setup({ saturation: 1, value: 0 });

    fireEvent(area, 'accessibilityAction', { nativeEvent: { actionName: 'moreSaturation' } });
    fireEvent(area, 'accessibilityAction', { nativeEvent: { actionName: 'darker' } });

    expect(onChange).toHaveBeenNthCalledWith(1, { s: 1, v: 0 });
    expect(onChange).toHaveBeenNthCalledWith(2, { s: 1, v: 0 });
  });

  it('se nombra y explica para el lector de pantalla', () => {
    setup();

    expect(screen.getByLabelText('Saturación y brillo')).toBeTruthy();
    expect(screen.getByTestId('color-area').props.accessibilityHint).toContain('código');
  });
});
