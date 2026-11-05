import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ColorPalette } from '@/features/colors/colors.constants';
import { ApiError } from '@/lib/api';
import { notify } from '@/utils/alert';
import { CategoryForm } from './CategoryForm';
import type { Category } from './categories.types';

let mockSavedColors: { id: string; hex: string; createdAt: string }[] = [];
const mockSaveColor = jest.fn();
const mockCreateCategory = jest.fn();
const mockUpdateCategory = jest.fn();
let mockUpdating = false;

jest.mock('@/features/colors/useColors', () => ({
  useSavedColors: () => ({ data: mockSavedColors }),
  useSaveColor: () => ({ mutate: mockSaveColor }),
  useRemoveColor: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock('./useCategories', () => ({
  useCreateCategory: () => ({ mutate: mockCreateCategory, isPending: false }),
  useUpdateCategory: () => ({ mutate: mockUpdateCategory, isPending: mockUpdating }),
}));

jest.mock('@/utils/alert', () => ({ notify: jest.fn() }));

beforeEach(() => {
  mockSavedColors = [];
  mockUpdating = false;
  mockSaveColor.mockClear();
  mockCreateCategory.mockClear();
  mockUpdateCategory.mockReset();
  jest.mocked(notify).mockClear();
});

const existing: Category = { id: 'cat-1', name: 'Cafe', icon: 'coffee', color: ColorPalette[1], type: 'EXPENSE' };

const nameInput = () => screen.getByTestId('category-name-input');
const submit = () => fireEvent.press(screen.getByTestId('category-submit'));

describe('CategoryForm (crear)', () => {
  it('expone el toggle Gasto/Ingreso como grupo de radios accesible', () => {
    render(<CategoryForm onDone={jest.fn()} />);

    const gasto = screen.getByLabelText('Gasto');
    const ingreso = screen.getByLabelText('Ingreso');
    expect(gasto.props.accessibilityRole).toBe('radio');
    expect(gasto.props.accessibilityState).toMatchObject({ selected: true });
    expect(ingreso.props.accessibilityState).toMatchObject({ selected: false });
  });

  it('marca como seleccionado el color de la paleta elegido', () => {
    render(<CategoryForm onDone={jest.fn()} />);

    expect(screen.getByLabelText('Color 1 de 10').props.accessibilityState).toMatchObject({ selected: true });

    fireEvent.press(screen.getByLabelText('Color 2 de 10'));

    expect(screen.getByLabelText('Color 2 de 10').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByLabelText('Color 1 de 10').props.accessibilityState).toMatchObject({ selected: false });
  });

  it('no tiene titulo de edicion ni boton Cancelar: el cierre lo hace el boton de la pantalla', () => {
    render(<CategoryForm onDone={jest.fn()} />);

    expect(screen.queryByText('Editar categoría')).toBeNull();
    expect(screen.queryByTestId('category-cancel')).toBeNull();
    expect(screen.getByTestId('category-submit').props.accessibilityLabel).toBe('Crear categoría');
  });

  it('crea la categoria con el nombre, el tipo y el color elegidos', async () => {
    const onDone = jest.fn();
    mockCreateCategory.mockImplementation((_values, options) => options.onSuccess());
    render(<CategoryForm onDone={onDone} />);

    fireEvent.changeText(nameInput(), 'Pruebas');
    fireEvent.press(screen.getByLabelText('Ingreso'));
    submit();

    await waitFor(() => expect(mockCreateCategory).toHaveBeenCalledTimes(1));
    expect(mockCreateCategory.mock.calls[0][0]).toEqual({ name: 'Pruebas', type: 'INCOME', color: ColorPalette[0], icon: 'tag' });
    expect(onDone).toHaveBeenCalled();
    expect(mockUpdateCategory).not.toHaveBeenCalled();
  });

  it('con el nombre vacio avisa y no crea nada', async () => {
    render(<CategoryForm onDone={jest.fn()} />);

    submit();

    expect(await screen.findByText('El nombre es obligatorio')).toBeTruthy();
    expect(mockCreateCategory).not.toHaveBeenCalled();
  });

  it('si el servidor rechaza la creacion lo avisa', async () => {
    mockCreateCategory.mockImplementation((_values, options) => options.onError(new ApiError(400, 'Ya existe una categoría con ese nombre y tipo')));
    const onDone = jest.fn();
    render(<CategoryForm onDone={onDone} />);

    fireEvent.changeText(nameInput(), 'Cafe');
    submit();

    await waitFor(() => expect(notify).toHaveBeenCalledWith('No se pudo crear', 'Ya existe una categoría con ese nombre y tipo'));
    expect(onDone).not.toHaveBeenCalled();
  });

  describe('color personalizado', () => {
    const create = async (name: string) => {
      fireEvent.changeText(nameInput(), name);
      submit();
      await waitFor(() => expect(mockCreateCategory).toHaveBeenCalledTimes(1));
    };

    it('crea la categoria con el color escrito a mano y lo guarda para la proxima vez', async () => {
      render(<CategoryForm onDone={jest.fn()} />);

      fireEvent.press(screen.getByLabelText('Elegir otro color'));
      fireEvent.changeText(screen.getByTestId('color-panel-hex'), 'e91e63');
      fireEvent.press(screen.getByTestId('color-panel-apply'));
      await create('Pruebas');

      expect(mockCreateCategory.mock.calls[0][0]).toEqual({ name: 'Pruebas', type: 'EXPENSE', color: '#E91E63', icon: 'tag' });
      expect(mockSaveColor).toHaveBeenCalledWith('#E91E63');
    });

    it('crea la categoria con un color guardado de la cuenta', async () => {
      mockSavedColors = [{ id: 'c1', hex: '#101010', createdAt: '2026-11-04T10:00:00.000Z' }];
      render(<CategoryForm onDone={jest.fn()} />);

      fireEvent.press(screen.getByLabelText('Color guardado #101010'));
      await create('Pruebas');

      expect(mockCreateCategory.mock.calls[0][0]).toMatchObject({ color: '#101010' });
      expect(mockSaveColor).not.toHaveBeenCalled();
    });

    it('si se cancela el selector, la categoria se crea con el color que habia', async () => {
      render(<CategoryForm onDone={jest.fn()} />);

      fireEvent.press(screen.getByLabelText('Elegir otro color'));
      fireEvent.changeText(screen.getByTestId('color-panel-hex'), '#00FF00');
      fireEvent.press(screen.getByTestId('color-panel-cancel'));
      await create('Pruebas');

      expect(mockCreateCategory.mock.calls[0][0]).toMatchObject({ color: ColorPalette[0] });
      expect(mockSaveColor).not.toHaveBeenCalled();
    });
  });
});

describe('CategoryForm (editar)', () => {
  it('abre con el titulo, el tipo, el nombre y el color de la categoria', () => {
    render(<CategoryForm category={existing} onDone={jest.fn()} />);

    expect(screen.getByRole('header', { name: 'Editar categoría' })).toBeTruthy();
    expect(screen.getByText('Categoría de gasto')).toBeTruthy();
    expect(nameInput().props.value).toBe('Cafe');
    expect(screen.getByLabelText('Color 2 de 10').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByTestId('category-submit').props.accessibilityLabel).toBe('Guardar cambios');
  });

  it('una categoria de ingreso lo dice', () => {
    render(<CategoryForm category={{ ...existing, type: 'INCOME' }} onDone={jest.fn()} />);

    expect(screen.getByText('Categoría de ingreso')).toBeTruthy();
  });

  it('no deja cambiar el tipo: no hay selector Gasto/Ingreso', () => {
    render(<CategoryForm category={existing} onDone={jest.fn()} />);

    expect(screen.queryByLabelText('Gasto')).toBeNull();
    expect(screen.queryByLabelText('Ingreso')).toBeNull();
  });

  it('una categoria con un color propio lo muestra como elegido', () => {
    render(<CategoryForm category={{ ...existing, color: '#123456' }} onDone={jest.fn()} />);

    expect(screen.getByLabelText('Color personalizado #123456').props.accessibilityState).toMatchObject({ selected: true });
  });

  describe('guardar', () => {
    it('cambiar solo el nombre manda solo el nombre', async () => {
      const onDone = jest.fn();
      mockUpdateCategory.mockImplementation((_vars, options) => options.onSuccess());
      render(<CategoryForm category={existing} onDone={onDone} />);

      fireEvent.changeText(nameInput(), 'Cafeteria');
      submit();

      await waitFor(() => expect(mockUpdateCategory).toHaveBeenCalledTimes(1));
      expect(mockUpdateCategory.mock.calls[0][0]).toEqual({ id: 'cat-1', name: 'Cafeteria' });
      expect(onDone).toHaveBeenCalled();
      expect(mockCreateCategory).not.toHaveBeenCalled();
    });

    it('cambiar solo el color manda solo el color', async () => {
      render(<CategoryForm category={existing} onDone={jest.fn()} />);

      fireEvent.press(screen.getByLabelText('Color 4 de 10'));
      submit();

      await waitFor(() => expect(mockUpdateCategory).toHaveBeenCalledTimes(1));
      expect(mockUpdateCategory.mock.calls[0][0]).toEqual({ id: 'cat-1', color: ColorPalette[3] });
    });

    it('cambiar las dos cosas las manda juntas, y el nombre sin espacios sobrantes', async () => {
      render(<CategoryForm category={existing} onDone={jest.fn()} />);

      fireEvent.changeText(nameInput(), '  Cafeteria  ');
      fireEvent.press(screen.getByLabelText('Color 4 de 10'));
      submit();

      await waitFor(() => expect(mockUpdateCategory).toHaveBeenCalledTimes(1));
      expect(mockUpdateCategory.mock.calls[0][0]).toEqual({ id: 'cat-1', name: 'Cafeteria', color: ColorPalette[3] });
    });

    it('un color escrito a mano se manda en mayusculas y se guarda para la proxima vez', async () => {
      render(<CategoryForm category={existing} onDone={jest.fn()} />);

      fireEvent.press(screen.getByLabelText('Elegir otro color'));
      fireEvent.changeText(screen.getByTestId('color-panel-hex'), 'e91e63');
      fireEvent.press(screen.getByTestId('color-panel-apply'));
      submit();

      await waitFor(() => expect(mockUpdateCategory).toHaveBeenCalledTimes(1));
      expect(mockUpdateCategory.mock.calls[0][0]).toEqual({ id: 'cat-1', color: '#E91E63' });
      expect(mockSaveColor).toHaveBeenCalledWith('#E91E63');
    });

    it('si no ha cambiado nada no pide nada al servidor y cierra', async () => {
      const onDone = jest.fn();
      render(<CategoryForm category={existing} onDone={onDone} />);

      submit();

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      expect(mockUpdateCategory).not.toHaveBeenCalled();
    });

    it('el color en minusculas del servidor y el mismo en mayusculas cuentan como el mismo', async () => {
      const onDone = jest.fn();
      render(<CategoryForm category={{ ...existing, color: '#e91e63' }} onDone={onDone} />);

      submit();

      await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
      expect(mockUpdateCategory).not.toHaveBeenCalled();
    });

    it('cambiar solo mayusculas del nombre es un cambio', async () => {
      render(<CategoryForm category={existing} onDone={jest.fn()} />);

      fireEvent.changeText(nameInput(), 'CAFE');
      submit();

      await waitFor(() => expect(mockUpdateCategory).toHaveBeenCalledTimes(1));
      expect(mockUpdateCategory.mock.calls[0][0]).toEqual({ id: 'cat-1', name: 'CAFE' });
    });

    it('con el nombre vacio avisa y no manda nada', async () => {
      render(<CategoryForm category={existing} onDone={jest.fn()} />);

      fireEvent.changeText(nameInput(), '   ');
      submit();

      expect(await screen.findByText('El nombre es obligatorio')).toBeTruthy();
      expect(mockUpdateCategory).not.toHaveBeenCalled();
    });

    it('si el servidor rechaza el cambio (p. ej. nombre repetido) lo avisa y no cierra', async () => {
      mockUpdateCategory.mockImplementation((_vars, options) =>
        options.onError(new ApiError(400, 'Ya existe una categoría con ese nombre y tipo')),
      );
      const onDone = jest.fn();
      render(<CategoryForm category={existing} onDone={onDone} />);

      fireEvent.changeText(nameInput(), 'Te');
      submit();

      await waitFor(() => expect(notify).toHaveBeenCalledWith('No se pudo guardar', 'Ya existe una categoría con ese nombre y tipo'));
      expect(onDone).not.toHaveBeenCalled();
    });

    it('un error inesperado tambien se avisa', async () => {
      mockUpdateCategory.mockImplementation((_vars, options) => options.onError(new Error('boom')));
      render(<CategoryForm category={existing} onDone={jest.fn()} />);

      fireEvent.changeText(nameInput(), 'Te');
      submit();

      await waitFor(() => expect(notify).toHaveBeenCalledWith('No se pudo guardar', 'Error inesperado'));
    });
  });

  describe('cancelar y mientras se guarda', () => {
    it('"Cancelar" cierra sin pedir nada', () => {
      const onDone = jest.fn();
      render(<CategoryForm category={existing} onDone={onDone} />);

      fireEvent.changeText(nameInput(), 'Cambiado');
      fireEvent.press(screen.getByTestId('category-cancel'));

      expect(onDone).toHaveBeenCalledTimes(1);
      expect(mockUpdateCategory).not.toHaveBeenCalled();
    });

    it('mientras se guarda, el boton muestra que esta ocupado y no se puede cancelar', () => {
      mockUpdating = true;
      render(<CategoryForm category={existing} onDone={jest.fn()} />);

      expect(screen.getByTestId('category-submit').props.accessibilityState).toMatchObject({ busy: true });
      expect(screen.getByTestId('category-cancel').props.accessibilityState).toMatchObject({ disabled: true });
    });
  });
});
