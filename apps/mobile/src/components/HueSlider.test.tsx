import { fireEvent, render, screen } from '@testing-library/react-native';
import { HueSlider } from './HueSlider';

const layout = (width = 360, height = 44) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height } } });
const touch = (x: number) => ({ nativeEvent: { locationX: x, locationY: 10 } });

const setup = (hue = 120) => {
  const onChange = jest.fn();
  render(<HueSlider hue={hue} onChange={onChange} />);
  const slider = screen.getByTestId('hue-slider');
  fireEvent(slider, 'layout', layout());
  return { onChange, slider };
};

const flat = (style: unknown) => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

describe('HueSlider', () => {
  it('tocar un punto de la tira da su matiz (0 a la izquierda, 360 a la derecha)', () => {
    const { onChange, slider } = setup();

    fireEvent(slider, 'responderGrant', touch(0));
    fireEvent(slider, 'responderGrant', touch(180));
    fireEvent(slider, 'responderGrant', touch(360));

    expect(onChange.mock.calls.map(([hue]) => hue)).toEqual([0, 180, 360]);
  });

  it('arrastrar sigue al dedo y lo que cae fuera se recorta', () => {
    const { onChange, slider } = setup();

    fireEvent(slider, 'responderGrant', touch(120));
    fireEvent(slider, 'responderMove', touch(240));
    fireEvent(slider, 'responderMove', touch(-50));
    fireEvent(slider, 'responderMove', touch(999));

    expect(onChange.mock.calls.map(([hue]) => hue)).toEqual([120, 240, 0, 360]);
  });

  it('antes de medirse (ancho 0) no manda nada', () => {
    const onChange = jest.fn();
    render(<HueSlider hue={0} onChange={onChange} />);

    fireEvent(screen.getByTestId('hue-slider'), 'responderGrant', touch(100));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('el tirador esta en la posicion del matiz y lleva su color', () => {
    setup(180);

    const thumb = flat(screen.getByTestId('hue-slider-thumb').props.style);

    // 180 / 360 de 360 px = 180, menos la mitad del tirador (28 / 2).
    expect(thumb.left).toBeCloseTo(180 - 14);
    expect(thumb.backgroundColor).toBe('#00FFFF');
  });

  it('se expone como ajustable, con su valor, para el lector de pantalla', () => {
    setup(90);

    const slider = screen.getByLabelText('Tono');
    expect(slider.props.accessibilityRole).toBe('adjustable');
    expect(slider.props.accessibilityValue).toEqual({ min: 0, max: 360, now: 90 });
  });

  it('subir y bajar con acciones de accesibilidad mueve el matiz de 10 en 10 sin salirse de 0..360', () => {
    const { onChange, slider } = setup(100);

    fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    fireEvent(slider, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(onChange.mock.calls.map(([hue]) => hue)).toEqual([110, 90]);
  });

  it('las acciones se recortan en los extremos y se ignoran las desconocidas', () => {
    const { onChange } = setup(355);
    fireEvent(screen.getByTestId('hue-slider'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(onChange).toHaveBeenLastCalledWith(360);

    onChange.mockClear();
    fireEvent(screen.getByTestId('hue-slider'), 'accessibilityAction', { nativeEvent: { actionName: 'activate' } });
    expect(onChange).not.toHaveBeenCalled();
  });
});
