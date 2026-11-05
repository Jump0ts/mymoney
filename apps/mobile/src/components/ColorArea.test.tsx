import { fireEvent, render, screen } from '@testing-library/react-native';
import { ColorArea } from './ColorArea';

const layout = (width = 200, height = 100) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height } } });
const touch = (x: number, y: number) => ({ nativeEvent: { locationX: x, locationY: y } });

const setup = (props: Partial<React.ComponentProps<typeof ColorArea>> = {}) => {
  const onChange = jest.fn();
  render(<ColorArea hue={240} saturation={0.5} value={0.5} onChange={onChange} {...props} />);
  fireEvent(screen.getByTestId('color-area'), 'layout', layout());
  return { onChange, area: screen.getByTestId('color-area') };
};

describe('ColorArea', () => {
  it('tocar un punto da su saturacion (hacia la derecha) y su brillo (hacia arriba)', () => {
    const { onChange, area } = setup();

    fireEvent(area, 'responderGrant', touch(50, 20));

    expect(onChange).toHaveBeenLastCalledWith({ s: 0.25, v: 0.8 });
  });

  it('arrastrar sigue al dedo', () => {
    const { onChange, area } = setup();

    fireEvent(area, 'responderGrant', touch(10, 90));
    fireEvent(area, 'responderMove', touch(150, 30));

    expect(onChange).toHaveBeenNthCalledWith(1, { s: 0.05, v: expect.closeTo(0.1) });
    expect(onChange).toHaveBeenNthCalledWith(2, { s: 0.75, v: 0.7 });
  });

  it('las esquinas son los extremos y lo que cae fuera se recorta', () => {
    const { onChange, area } = setup();

    fireEvent(area, 'responderMove', touch(200, 0));
    expect(onChange).toHaveBeenLastCalledWith({ s: 1, v: 1 });

    fireEvent(area, 'responderMove', touch(-30, 400));
    expect(onChange).toHaveBeenLastCalledWith({ s: 0, v: 0 });
  });

  it('antes de medirse no hace nada raro (tamano 0)', () => {
    const onChange = jest.fn();
    render(<ColorArea hue={0} saturation={0} value={0} onChange={onChange} />);

    fireEvent(screen.getByTestId('color-area'), 'responderGrant', touch(10, 10));

    expect(onChange).toHaveBeenLastCalledWith({ s: 0, v: 0 });
  });

  it('el tirador esta donde dicen la saturacion y el brillo', () => {
    setup({ saturation: 0.25, value: 0.8 });

    const style = screen.getByTestId('color-area-thumb').props.style;
    const flat = Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

    // x = 0.25 * 200, y = (1 - 0.8) * 100, menos la mitad del tirador (28 / 2).
    expect(flat.left).toBeCloseTo(50 - 14);
    expect(flat.top).toBeCloseTo(20 - 14);
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
