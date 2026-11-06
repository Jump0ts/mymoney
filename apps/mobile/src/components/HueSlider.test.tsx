import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { drag } from '@/testing/drag';
import { HueSlider } from './HueSlider';

const layout = (width = 360, height = 44) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height } } });

const setup = (hue = 120) => {
  const onChange = jest.fn();
  render(<HueSlider hue={hue} onChange={onChange} />);
  const slider = screen.getByTestId('hue-slider');
  fireEvent(slider, 'layout', layout());
  return { onChange, slider };
};

const flat = (style: unknown) => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));

describe('HueSlider', () => {
  it('tocar un punto de la tira da su matiz (0 a la izquierda, 360 a la derecha)', async () => {
    const { onChange } = setup();

    await drag('hue-slider-pan', [[0, 10]]);
    await drag('hue-slider-pan', [[180, 10]]);
    await drag('hue-slider-pan', [[360, 10]]);

    expect(onChange.mock.calls.map(([hue]) => hue)).toEqual([0, 180, 360]);
  });

  it('arrastrar sigue al dedo y lo que cae fuera se recorta', async () => {
    const { onChange } = setup();

    await drag('hue-slider-pan', [[120, 10], [240, 10], [-50, 10], [999, 10]]);

    expect(onChange.mock.calls.map(([hue]) => hue)).toEqual([120, 240, 0, 360]);
  });

  it('antes de medirse (ancho 0) no manda nada', async () => {
    const onChange = jest.fn();
    render(<HueSlider hue={0} onChange={onChange} />);

    await drag('hue-slider-pan', [[100, 10]]);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('el tirador esta en la posicion del matiz y lleva su color', async () => {
    setup(180);

    const thumb = screen.getByTestId('hue-slider-thumb');
    // 180 / 360 de 360 px = 180, menos la mitad del tirador (28 / 2).
    // El tirador se coloca en un efecto: se espera a que Reanimated lo aplique.
    await act(async () => {});
    expect(thumb).toHaveAnimatedStyle({ transform: [{ translateX: 180 - 14 }] });
    expect(flat(thumb.props.style).backgroundColor).toBe('#00FFFF');
  });

  it('al arrastrar, el tirador va donde esta el dedo (recortado a la tira) sin esperar al valor', async () => {
    setup(0);

    await drag('hue-slider-pan', [[90, 10]]);
    expect(screen.getByTestId('hue-slider-thumb')).toHaveAnimatedStyle({ transform: [{ translateX: 90 - 14 }] });

    await drag('hue-slider-pan', [[999, 10]]);
    expect(screen.getByTestId('hue-slider-thumb')).toHaveAnimatedStyle({ transform: [{ translateX: 360 - 14 }] });
  });

  it('si el matiz cambia por otro camino (el campo del codigo) el tirador se recoloca', async () => {
    const onChange = jest.fn();
    const { rerender } = render(<HueSlider hue={0} onChange={onChange} />);
    fireEvent(screen.getByTestId('hue-slider'), 'layout', layout());

    rerender(<HueSlider hue={270} onChange={onChange} />);

    // El tirador se coloca en un efecto: se espera a que Reanimated lo aplique.
    await act(async () => {});
    expect(screen.getByTestId('hue-slider-thumb')).toHaveAnimatedStyle({ transform: [{ translateX: 270 - 14 }] });
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

describe('HueSlider - los hijos no reciben toques', () => {
  it('el tirador no intercepta los toques de la zona (lo dice el estilo, no la propiedad obsoleta)', () => {
    setup();

    const thumb = screen.getByTestId('hue-slider-thumb');

    expect(flat(thumb.props.style).pointerEvents).toBe('none');
    expect(thumb.props.pointerEvents).toBeUndefined();
  });
});
