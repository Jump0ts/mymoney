import { fireEvent, render, screen } from '@testing-library/react-native';
import { drag } from '@/testing/drag';
import { ColorPanel } from './ColorPanel';

const layout = (width: number, height: number) => ({ nativeEvent: { layout: { x: 0, y: 0, width, height } } });

const flat = (style: unknown) => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
const hexInput = () => screen.getByTestId('color-panel-hex');
const previewColor = () => flat(screen.getByTestId('color-panel-preview', { hidden: true }).props.style).backgroundColor;

const setup = (props: Partial<React.ComponentProps<typeof ColorPanel>> = {}) => {
  const onApply = jest.fn();
  const onCancel = jest.fn();
  render(<ColorPanel initialColor="#4F5DFF" onApply={onApply} onCancel={onCancel} {...props} />);
  // El area (320x160) y la tira (320x44) se miden al dibujarse.
  fireEvent(screen.getByTestId('color-area'), 'layout', layout(320, 160));
  fireEvent(screen.getByTestId('hue-slider'), 'layout', layout(320, 44));
  return { onApply, onCancel };
};

describe('ColorPanel', () => {
  it('se abre con el color que estaba elegido', () => {
    setup({ initialColor: '#e91e63' });

    expect(hexInput().props.value).toBe('#E91E63');
    expect(previewColor()).toBe('#E91E63');
  });

  it('si el color de partida no es valido empieza por uno de la paleta', () => {
    setup({ initialColor: 'rojo' });

    expect(hexInput().props.value).toBe('#6C5CE7');
  });

  describe('escribir el codigo', () => {
    it('un codigo valido mueve la vista previa y el matiz', () => {
      setup();

      fireEvent.changeText(hexInput(), '#00FF00');

      expect(previewColor()).toBe('#00FF00');
      expect(screen.getByTestId('hue-slider').props.accessibilityValue.now).toBe(120);
    });

    it('mientras se escribe a medias la vista previa se queda con el ultimo color bueno', () => {
      setup();

      fireEvent.changeText(hexInput(), '#00FF');

      expect(previewColor()).toBe('#4F5DFF');
    });

    it('acepta minusculas, sin # y la forma corta, y los manda normalizados', () => {
      const { onApply } = setup();

      fireEvent.changeText(hexInput(), 'e91e63');
      fireEvent.press(screen.getByTestId('color-panel-apply'));
      expect(onApply).toHaveBeenLastCalledWith('#E91E63');

      fireEvent.changeText(hexInput(), '#abc');
      fireEvent.press(screen.getByTestId('color-panel-apply'));
      expect(onApply).toHaveBeenLastCalledWith('#AABBCC');
    });

    it('un codigo invalido muestra el error, no aplica nada y se quita al seguir escribiendo', () => {
      const { onApply } = setup();

      fireEvent.changeText(hexInput(), '#12G45');
      fireEvent.press(screen.getByTestId('color-panel-apply'));

      expect(screen.getByText('Escribe un color como #1A2B3C')).toBeTruthy();
      expect(onApply).not.toHaveBeenCalled();

      fireEvent.changeText(hexInput(), '#12345');
      expect(screen.queryByText('Escribe un color como #1A2B3C')).toBeNull();
    });

    it('un codigo vacio pide escribir un color', () => {
      const { onApply } = setup();

      fireEvent.changeText(hexInput(), '');
      fireEvent.press(screen.getByTestId('color-panel-apply'));

      expect(screen.getByText('Escribe un color')).toBeTruthy();
      expect(onApply).not.toHaveBeenCalled();
    });

    it('el campo admite como mucho 7 caracteres y avisa al lector de pantalla de su nombre', () => {
      setup();

      expect(hexInput().props.maxLength).toBe(7);
      expect(screen.getByLabelText('Código del color')).toBeTruthy();
    });
  });

  describe('mover el selector', () => {
    it('arrastrar por el area cambia el codigo y la vista previa', async () => {
      setup({ initialColor: '#FF0000' });

      // Esquina superior derecha: saturacion y brillo maximos con el mismo matiz.
      await drag('color-area-pan', [[320, 0]]);
      expect(hexInput().props.value).toBe('#FF0000');

      // Mitad de la saturacion y del brillo.
      await drag('color-area-pan', [[160, 80]]);
      expect(hexInput().props.value).toBe('#804040');
      expect(previewColor()).toBe('#804040');
    });

    it('mover la tira de matiz cambia el matiz y conserva la saturacion y el brillo', async () => {
      setup({ initialColor: '#FF0000' });

      // 1/3 de la tira = 120 grados: del rojo al verde.
      await drag('hue-slider-pan', [[320 / 3, 10]]);

      expect(hexInput().props.value).toBe('#00FF00');
    });

    it('arrastrar quita un error anterior', async () => {
      setup();
      fireEvent.changeText(hexInput(), 'zz');
      fireEvent.press(screen.getByTestId('color-panel-apply'));
      expect(screen.getByText('Escribe un color como #1A2B3C')).toBeTruthy();

      await drag('color-area-pan', [[100, 50]]);

      expect(screen.queryByText('Escribe un color como #1A2B3C')).toBeNull();
    });

    it('lo que se arrastra se aplica tal cual', async () => {
      const { onApply } = setup({ initialColor: '#FF0000' });

      await drag('hue-slider-pan', [[320 / 3, 10]]);
      fireEvent.press(screen.getByTestId('color-panel-apply'));

      expect(onApply).toHaveBeenCalledWith('#00FF00');
    });
  });

  describe('botones', () => {
    it('"Usar color" aplica el color actual sin tocarlo si no se ha movido nada', () => {
      const { onApply, onCancel } = setup({ initialColor: '#1a2b3c' });

      fireEvent.press(screen.getByTestId('color-panel-apply'));

      expect(onApply).toHaveBeenCalledWith('#1A2B3C');
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('"Cancelar" cierra sin aplicar', () => {
      const { onApply, onCancel } = setup();

      fireEvent.changeText(hexInput(), '#00FF00');
      fireEvent.press(screen.getByTestId('color-panel-cancel'));

      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onApply).not.toHaveBeenCalled();
    });
  });

  describe('nota bajo el codigo', () => {
    it('muestra lo que diga noteFor para el color que se esta eligiendo', () => {
      const noteFor = jest.fn((hex: string) => (hex === '#00FF00' ? 'Este es verde' : null));
      setup({ noteFor });

      expect(screen.queryByText('Este es verde')).toBeNull();

      fireEvent.changeText(hexInput(), '#00FF00');

      expect(screen.getByText('Este es verde')).toBeTruthy();
      expect(noteFor).toHaveBeenLastCalledWith('#00FF00');
    });

    it('sin noteFor no hay nota', () => {
      setup();

      expect(screen.queryByText(/guardará/)).toBeNull();
    });
  });
});
