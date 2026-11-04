import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ColorPalette } from '@/features/colors/colors.constants';
import { NewCategoryForm } from './NewCategoryForm';

// El campo de color pide los colores propios guardados al servidor: aqui no hay ninguno.
let mockSavedColors: { id: string; hex: string; createdAt: string }[] = [];
const mockSaveColor = jest.fn();
const mockCreateCategory = jest.fn();

jest.mock('@/features/colors/useColors', () => ({
  useSavedColors: () => ({ data: mockSavedColors }),
  useSaveColor: () => ({ mutate: mockSaveColor }),
  useRemoveColor: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('./useCategories', () => ({
  useCreateCategory: () => ({ mutate: mockCreateCategory, isPending: false }),
}));

beforeEach(() => {
  mockSavedColors = [];
  mockSaveColor.mockClear();
  mockCreateCategory.mockClear();
});

describe('NewCategoryForm', () => {
  it('expone el toggle Gasto/Ingreso como grupo de radios accesible', () => {
    render(<NewCategoryForm onDone={jest.fn()} />);

    const gasto = screen.getByLabelText('Gasto');
    const ingreso = screen.getByLabelText('Ingreso');
    expect(gasto.props.accessibilityRole).toBe('radio');
    expect(gasto.props.accessibilityState).toMatchObject({ selected: true });
    expect(ingreso.props.accessibilityState).toMatchObject({ selected: false });
  });

  it('marca como seleccionado el color de la paleta elegido', () => {
    render(<NewCategoryForm onDone={jest.fn()} />);

    expect(screen.getByLabelText('Color 1 de 10').props.accessibilityState).toMatchObject({ selected: true });

    fireEvent.press(screen.getByLabelText('Color 2 de 10'));

    expect(screen.getByLabelText('Color 2 de 10').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByLabelText('Color 1 de 10').props.accessibilityState).toMatchObject({ selected: false });
  });

  describe('color personalizado', () => {
    // El envio de React Hook Form valida de forma asincrona: se espera a que llegue la creacion.
    const create = async (name: string) => {
      fireEvent.changeText(screen.getByPlaceholderText('Nombre de la categoría'), name);
      fireEvent.press(screen.getByRole('button', { name: 'Crear categoría' }));
      await waitFor(() => expect(mockCreateCategory).toHaveBeenCalledTimes(1));
    };

    it('crea la categoria con el color escrito a mano y lo guarda para la proxima vez', async () => {
      render(<NewCategoryForm onDone={jest.fn()} />);

      fireEvent.press(screen.getByLabelText('Elegir otro color'));
      fireEvent.changeText(screen.getByTestId('color-panel-hex'), 'e91e63');
      fireEvent.press(screen.getByTestId('color-panel-apply'));
      await create('Pruebas');

      expect(mockCreateCategory.mock.calls[0][0]).toEqual({ name: 'Pruebas', type: 'EXPENSE', color: '#E91E63', icon: 'tag' });
      expect(mockSaveColor).toHaveBeenCalledWith('#E91E63');
    });

    it('crea la categoria con un color guardado de la cuenta', async () => {
      mockSavedColors = [{ id: 'c1', hex: '#101010', createdAt: '2026-11-04T10:00:00.000Z' }];
      render(<NewCategoryForm onDone={jest.fn()} />);

      fireEvent.press(screen.getByLabelText('Color guardado #101010'));
      await create('Pruebas');

      expect(mockCreateCategory.mock.calls[0][0]).toMatchObject({ color: '#101010' });
      expect(mockSaveColor).not.toHaveBeenCalled();
    });

    it('si se cancela el selector, la categoria se crea con el color que habia', async () => {
      render(<NewCategoryForm onDone={jest.fn()} />);

      fireEvent.press(screen.getByLabelText('Elegir otro color'));
      fireEvent.changeText(screen.getByTestId('color-panel-hex'), '#00FF00');
      fireEvent.press(screen.getByTestId('color-panel-cancel'));
      await create('Pruebas');

      expect(mockCreateCategory.mock.calls[0][0]).toMatchObject({ color: ColorPalette[0] });
      expect(mockSaveColor).not.toHaveBeenCalled();
    });
  });
});
