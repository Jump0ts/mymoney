import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { CategoryPalette } from '@/features/categories/categories.constants';
import { ApiError } from '@/lib/api';
import { confirmAsync } from '@/utils/alert';
import { BudgetGroupForm } from './BudgetGroupForm';

jest.mock('@/utils/alert', () => ({ confirmAsync: jest.fn().mockResolvedValue(true), notify: jest.fn() }));

const renderForm = (props: Partial<React.ComponentProps<typeof BudgetGroupForm>> = {}) => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  const onCancel = jest.fn();
  render(<BudgetGroupForm submitLabel="Crear grupo" onSubmit={onSubmit} onCancel={onCancel} {...props} />);
  return { onSubmit, onCancel };
};

describe('BudgetGroupForm', () => {
  it('crea un grupo con el nombre escrito y el primer color por defecto', async () => {
    const { onSubmit } = renderForm();

    fireEvent.changeText(screen.getByTestId('budget-group-name'), 'Hogar');
    fireEvent.press(screen.getByTestId('budget-group-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: 'Hogar',
      color: CategoryPalette[0],
      limit: '',
      isRemainder: false,
    });
  });

  it('envia el color que se elija', async () => {
    const { onSubmit } = renderForm();

    fireEvent.changeText(screen.getByTestId('budget-group-name'), 'Deseos');
    fireEvent.press(screen.getByLabelText('Color 4 de 10'));
    fireEvent.press(screen.getByTestId('budget-group-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].color).toBe(CategoryPalette[3]);
  });

  it('envia el limite escrito, y es opcional', async () => {
    const { onSubmit } = renderForm();

    fireEvent.changeText(screen.getByTestId('budget-group-name'), 'Gastos fijos');
    fireEvent.changeText(screen.getByTestId('budget-group-limit'), '600');
    fireEvent.press(screen.getByTestId('budget-group-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: 'Gastos fijos', limit: '600', isRemainder: false });
  });

  it('rechaza un limite que no es un importe valido', async () => {
    const { onSubmit } = renderForm();

    fireEvent.changeText(screen.getByTestId('budget-group-name'), 'Gastos fijos');
    fireEvent.changeText(screen.getByTestId('budget-group-limit'), '-20');
    fireEvent.press(screen.getByTestId('budget-group-submit'));

    expect(await screen.findByText('Introduce un límite válido mayor que 0')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('precarga el limite al editar y se puede vaciar para quitarlo', async () => {
    const { onSubmit } = renderForm({
      defaultValues: { name: 'Gastos fijos', color: CategoryPalette[0], limit: '600', isRemainder: false },
    });
    expect(screen.getByDisplayValue('600')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('budget-group-limit'), '');
    fireEvent.press(screen.getByTestId('budget-group-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].limit).toBe('');
  });

  it('marcar que recibe lo que sobra oculta el limite y envia el grupo sin limite', async () => {
    const { onSubmit } = renderForm();

    fireEvent.changeText(screen.getByTestId('budget-group-name'), 'Caprichos');
    fireEvent.changeText(screen.getByTestId('budget-group-limit'), '50');
    fireEvent(screen.getByTestId('budget-group-remainder'), 'valueChange', true);

    expect(screen.queryByTestId('budget-group-limit')).toBeNull();
    expect(screen.getByTestId('budget-group-remainder').props.value).toBe(true);

    fireEvent.press(screen.getByTestId('budget-group-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: 'Caprichos', limit: '', isRemainder: true });
  });

  it('el interruptor se expone como switch y se puede desmarcar', () => {
    renderForm({ defaultValues: { name: 'Caprichos', color: CategoryPalette[0], limit: '', isRemainder: true } });
    const toggle = screen.getByLabelText('Recibe lo que sobra del sueldo');

    expect(toggle.props.value).toBe(true);
    expect(screen.queryByTestId('budget-group-limit')).toBeNull();

    fireEvent(toggle, 'valueChange', false);

    expect(screen.getByTestId('budget-group-limit')).toBeTruthy();
  });

  it('muestra el error del servidor si ya hay otro grupo del sobrante', async () => {
    renderForm({
      onSubmit: jest.fn().mockRejectedValue(new ApiError(400, 'Ya existe un grupo que recibe lo que sobra: Ocio')),
    });

    fireEvent.changeText(screen.getByTestId('budget-group-name'), 'Caprichos');
    fireEvent(screen.getByTestId('budget-group-remainder'), 'valueChange', true);
    fireEvent.press(screen.getByTestId('budget-group-submit'));

    expect(await screen.findByText(/Ya existe un grupo que recibe lo que sobra/)).toBeTruthy();
  });

  it('exige un nombre', async () => {
    const { onSubmit } = renderForm();

    fireEvent.press(screen.getByTestId('budget-group-submit'));

    expect(await screen.findByText('El nombre es obligatorio')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('muestra el error del servidor (p. ej. nombre duplicado)', async () => {
    renderForm({ onSubmit: jest.fn().mockRejectedValue(new ApiError(400, 'Ya existe un grupo con ese nombre')) });

    fireEvent.changeText(screen.getByTestId('budget-group-name'), 'Hogar');
    fireEvent.press(screen.getByTestId('budget-group-submit'));

    expect(await screen.findByText('Ya existe un grupo con ese nombre')).toBeTruthy();
  });

  it('precarga los valores al editar', () => {
    renderForm({ defaultValues: { name: 'Alquiler', color: CategoryPalette[2], limit: '', isRemainder: false } });

    expect(screen.getByDisplayValue('Alquiler')).toBeTruthy();
    expect(screen.getByLabelText('Color 3 de 10').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('cancela sin enviar', () => {
    const { onSubmit, onCancel } = renderForm();

    fireEvent.press(screen.getByTestId('budget-group-cancel'));

    expect(onCancel).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('pide confirmacion al cancelar con cambios sin guardar, y no si no hay cambios', async () => {
    const { onCancel } = renderForm();
    jest.mocked(confirmAsync).mockClear();

    fireEvent.press(screen.getByTestId('budget-group-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(confirmAsync).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByTestId('budget-group-name'), 'Hogar');
    fireEvent.press(screen.getByTestId('budget-group-cancel'));
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(2));
    expect(confirmAsync).toHaveBeenCalledWith(expect.objectContaining({ title: 'Descartar cambios' }));
  });

  it('bloquea cancelar y eliminar mientras se esta guardando', async () => {
    const onSubmit = jest.fn(() => new Promise(() => {}));
    const onDelete = jest.fn();
    const { onCancel } = renderForm({ onSubmit, onDelete });

    fireEvent.changeText(screen.getByTestId('budget-group-name'), 'Hogar');
    fireEvent.press(screen.getByTestId('budget-group-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId('budget-group-cancel'));
    fireEvent.press(screen.getByTestId('budget-group-delete'));

    expect(onCancel).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('nombra el selector de color para el lector de pantalla', () => {
    renderForm();

    expect(screen.getByLabelText('Color del grupo').props.accessibilityRole).toBe('radiogroup');
  });

  describe('eliminar', () => {
    it('no aparece al crear', () => {
      renderForm();
      expect(screen.queryByTestId('budget-group-delete')).toBeNull();
    });

    it('pide confirmacion antes de borrar', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined);
      renderForm({ defaultValues: { name: 'Hogar', color: CategoryPalette[0], limit: '', isRemainder: false }, onDelete });

      fireEvent.press(screen.getByTestId('budget-group-delete'));

      await waitFor(() => expect(onDelete).toHaveBeenCalled());
      expect(confirmAsync).toHaveBeenCalledWith(expect.objectContaining({ destructive: true }));
    });

    it('no borra si se cancela la confirmacion', async () => {
      jest.mocked(confirmAsync).mockResolvedValueOnce(false);
      const onDelete = jest.fn();
      renderForm({ defaultValues: { name: 'Hogar', color: CategoryPalette[0], limit: '', isRemainder: false }, onDelete });

      fireEvent.press(screen.getByTestId('budget-group-delete'));

      await waitFor(() => expect(confirmAsync).toHaveBeenCalled());
      expect(onDelete).not.toHaveBeenCalled();
    });

    it('muestra por que no se puede borrar un grupo con lineas', async () => {
      const onDelete = jest
        .fn()
        .mockRejectedValue(new ApiError(400, 'No se puede borrar un grupo que tiene líneas, ni siquiera de meses anteriores'));
      renderForm({ defaultValues: { name: 'Hogar', color: CategoryPalette[0], limit: '', isRemainder: false }, onDelete });

      fireEvent.press(screen.getByTestId('budget-group-delete'));

      expect(await screen.findByText(/No se puede borrar un grupo que tiene líneas/)).toBeTruthy();
    });
  });
});
