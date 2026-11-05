import { fireEvent, render, screen } from '@testing-library/react-native';
import { ColorField } from './ColorField';
import { MAX_SAVED_COLORS } from './colors.constants';
import type { SavedColor } from './colors.types';

let mockSaved: SavedColor[] = [];
const mockSave = jest.fn();
const mockRemove = jest.fn();
let mockRemoving = false;

jest.mock('./useColors', () => ({
  useSavedColors: () => ({ data: mockSaved }),
  useSaveColor: () => ({ mutate: mockSave }),
  useRemoveColor: () => ({ mutate: mockRemove, isPending: mockRemoving }),
}));

const saved = (hex: string, id = `id-${hex}`): SavedColor => ({ id, hex, createdAt: '2026-11-04T10:00:00.000Z' });

const setup = (value = '#4F5DFF') => {
  const onChange = jest.fn();
  render(<ColorField value={value} onChange={onChange} />);
  return { onChange };
};

const openPanel = () => fireEvent.press(screen.getByLabelText('Elegir otro color'));
const applyHex = (hex: string) => {
  fireEvent.changeText(screen.getByTestId('color-panel-hex'), hex);
  fireEvent.press(screen.getByTestId('color-panel-apply'));
};

beforeEach(() => {
  mockSaved = [];
  mockRemoving = false;
  mockSave.mockClear();
  mockRemove.mockClear();
});

describe('ColorField', () => {
  describe('paleta y colores guardados', () => {
    it('ofrece los 10 colores de siempre y el boton "+"', () => {
      setup();

      expect(screen.getAllByRole('radio')).toHaveLength(10);
      expect(screen.getByLabelText('Elegir otro color')).toBeTruthy();
    });

    it('anade los colores guardados de la cuenta detras de la paleta', () => {
      mockSaved = [saved('#E91E63'), saved('#101010')];
      setup();

      expect(screen.getAllByRole('radio')).toHaveLength(12);
      expect(screen.getByLabelText('Color guardado #E91E63')).toBeTruthy();
      expect(screen.getByLabelText('Color guardado #101010')).toBeTruthy();
    });

    it('elegir uno guardado lo manda a onChange', () => {
      mockSaved = [saved('#E91E63')];
      const { onChange } = setup();

      fireEvent.press(screen.getByLabelText('Color guardado #E91E63'));

      expect(onChange).toHaveBeenCalledWith('#E91E63');
    });

    it('un color elegido que no esta guardado se sigue viendo como elegido', () => {
      setup('#123456');

      expect(screen.getByLabelText('Color personalizado #123456').props.accessibilityState).toMatchObject({ selected: true });
    });

    it('el nombre del grupo llega al selector', () => {
      render(<ColorField value="#4F5DFF" onChange={jest.fn()} accessibilityLabel="Color del grupo" />);

      expect(screen.getByLabelText('Color del grupo')).toBeTruthy();
    });
  });

  describe('elegir un color cualquiera', () => {
    it('el "+" abre el selector con el color actual, y otra pulsacion lo cierra', () => {
      setup('#E91E63');

      expect(screen.queryByTestId('color-panel')).toBeNull();
      openPanel();
      expect(screen.getByTestId('color-panel')).toBeTruthy();
      expect(screen.getByTestId('color-panel-hex').props.value).toBe('#E91E63');

      openPanel();
      expect(screen.queryByTestId('color-panel')).toBeNull();
    });

    it('"Cancelar" lo cierra sin elegir ni guardar nada', () => {
      const { onChange } = setup();

      openPanel();
      fireEvent.changeText(screen.getByTestId('color-panel-hex'), '#00FF00');
      fireEvent.press(screen.getByTestId('color-panel-cancel'));

      expect(screen.queryByTestId('color-panel')).toBeNull();
      expect(onChange).not.toHaveBeenCalled();
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('un color nuevo se elige, se guarda y se cierra el selector', () => {
      const { onChange } = setup();

      openPanel();
      applyHex('e91e63');

      expect(onChange).toHaveBeenCalledWith('#E91E63');
      expect(mockSave).toHaveBeenCalledWith('#E91E63');
      expect(screen.queryByTestId('color-panel')).toBeNull();
    });

    it('un color que ya estaba guardado se elige sin volver a guardarlo (aunque se escriba en minusculas)', () => {
      mockSaved = [saved('#E91E63')];
      const { onChange } = setup();

      openPanel();
      applyHex('#e91e63');

      expect(onChange).toHaveBeenCalledWith('#E91E63');
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('un color de la paleta escrito a mano no se guarda como propio', () => {
      const { onChange } = setup('#1FA971');

      openPanel();
      applyHex('#4f5dff');

      expect(onChange).toHaveBeenCalledWith('#4F5DFF');
      expect(mockSave).not.toHaveBeenCalled();
    });

    it('un codigo invalido no elige ni guarda nada y deja el selector abierto', () => {
      const { onChange } = setup();

      openPanel();
      applyHex('#12G45');

      expect(onChange).not.toHaveBeenCalled();
      expect(mockSave).not.toHaveBeenCalled();
      expect(screen.getByTestId('color-panel')).toBeTruthy();
    });
  });

  describe('nota sobre guardar', () => {
    it('avisa de que un color nuevo se guardara', () => {
      setup();

      openPanel();
      fireEvent.changeText(screen.getByTestId('color-panel-hex'), '#E91E63');

      expect(screen.getByText('Se guardará en tus colores para usarlo otra vez.')).toBeTruthy();
    });

    it('no avisa de nada si el color ya esta guardado o es de la paleta', () => {
      mockSaved = [saved('#E91E63')];
      setup();

      openPanel();
      fireEvent.changeText(screen.getByTestId('color-panel-hex'), '#E91E63');
      expect(screen.queryByText(/guardará|guardado/)).toBeNull();

      fireEvent.changeText(screen.getByTestId('color-panel-hex'), '#4F5DFF');
      expect(screen.queryByText(/guardará|guardado/)).toBeNull();
    });
  });

  describe(`con ${MAX_SAVED_COLORS} colores guardados`, () => {
    const full = () => Array.from({ length: MAX_SAVED_COLORS }, (_, i) => saved(`#0000${(i + 16).toString(16).toUpperCase()}`));

    it('un color nuevo se usa pero no se guarda, y se avisa antes', () => {
      mockSaved = full();
      const { onChange } = setup();

      openPanel();
      fireEvent.changeText(screen.getByTestId('color-panel-hex'), '#E91E63');
      expect(screen.getByText(new RegExp(`Ya tienes ${MAX_SAVED_COLORS} colores guardados`))).toBeTruthy();

      fireEvent.press(screen.getByTestId('color-panel-apply'));

      expect(onChange).toHaveBeenCalledWith('#E91E63');
      expect(mockSave).not.toHaveBeenCalled();
    });
  });

  describe('quitar un color guardado', () => {
    it('al elegir uno guardado ofrece quitarlo, con su codigo en el boton', () => {
      mockSaved = [saved('#E91E63', 'abc')];
      setup('#E91E63');

      const button = screen.getByTestId('color-remove-saved');
      expect(button.props.accessibilityLabel).toBe('Quitar #E91E63 de mis colores');

      fireEvent.press(button);

      expect(mockRemove).toHaveBeenCalledWith('abc');
    });

    it('reconoce el color elegido aunque venga en minusculas', () => {
      mockSaved = [saved('#E91E63', 'abc')];
      setup('#e91e63');

      expect(screen.getByTestId('color-remove-saved')).toBeTruthy();
    });

    it('no se ofrece para un color de la paleta ni para uno que no esta guardado', () => {
      mockSaved = [saved('#E91E63')];
      const { onChange } = setup('#4F5DFF');
      expect(screen.queryByTestId('color-remove-saved')).toBeNull();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('no se ofrece con el selector abierto', () => {
      mockSaved = [saved('#E91E63')];
      setup('#E91E63');

      openPanel();

      expect(screen.queryByTestId('color-remove-saved')).toBeNull();
    });

    it('muestra que esta quitando mientras espera al servidor', () => {
      mockSaved = [saved('#E91E63')];
      mockRemoving = true;
      setup('#E91E63');

      expect(screen.getByTestId('color-remove-saved').props.accessibilityState).toMatchObject({ busy: true });
    });
  });
});
