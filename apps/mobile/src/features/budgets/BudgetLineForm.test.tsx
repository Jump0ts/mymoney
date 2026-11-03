import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { confirmAsync } from '@/utils/alert';
import { SCOPE_OPTIONS_CREATE } from './budgets.constants';
import type { BudgetLineFormValues } from './budgets.schema';
import { BudgetLineForm } from './BudgetLineForm';

jest.mock('@/utils/alert', () => ({ confirmAsync: jest.fn().mockResolvedValue(true), notify: jest.fn() }));

const emptyValues: BudgetLineFormValues = {
  name: '',
  lineType: 'EXPENSE',
  amount: '',
  scope: 'template',
};

beforeEach(() => {
  jest.mocked(confirmAsync).mockClear();
});

const renderForm = (props: Partial<React.ComponentProps<typeof BudgetLineForm>> = {}) => {
  const onSubmit = jest.fn().mockResolvedValue(undefined);
  const onCancel = jest.fn();
  render(
    <BudgetLineForm
      defaultValues={emptyValues}
      scopeOptions={SCOPE_OPTIONS_CREATE}
      submitLabel="Añadir línea"
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onSubmit, onCancel };
};

const fill = (name: string, amount: string) => {
  fireEvent.changeText(screen.getByTestId('budget-line-name'), name);
  fireEvent.changeText(screen.getByTestId('budget-line-amount'), amount);
};

describe('BudgetLineForm', () => {
  it('ofrece los tipos Gasto y Reembolso (no "Fijo", que no se entendia como opuesto de un reembolso)', () => {
    renderForm();

    expect(screen.getByText('Gasto')).toBeTruthy();
    expect(screen.getByText('Reembolso')).toBeTruthy();
    expect(screen.queryByText('Fijo')).toBeNull();
  });

  it('un gasto se envia con la linea de tipo gasto y un reembolso con el de reembolso', async () => {
    const { onSubmit } = renderForm();

    fill('Luz Ivan', '30');
    fireEvent.press(screen.getByText('Reembolso'));
    fireEvent.press(screen.getByTestId('budget-line-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ lineType: 'REFUND' });
  });

  it('envia el nombre, el importe y el alcance elegidos', async () => {
    const { onSubmit } = renderForm();

    fill('Netflix', '21,99');
    fireEvent.press(screen.getByTestId('budget-line-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'Netflix',
      lineType: 'EXPENSE',
      amount: '21,99',
      scope: 'template',
    });
  });

  it('permite cambiar a "Solo este mes"', async () => {
    const { onSubmit } = renderForm();

    fill('Regalo', '10');
    fireEvent.press(screen.getByLabelText('Solo este mes'));
    fireEvent.press(screen.getByTestId('budget-line-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].scope).toBe('month');
  });

  it('muestra los errores de validacion y no envia nada', async () => {
    const { onSubmit } = renderForm();

    fireEvent.press(screen.getByTestId('budget-line-submit'));

    expect(await screen.findByText('El nombre es obligatorio')).toBeTruthy();
    expect(screen.getByText('El importe es obligatorio')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rechaza un importe que no es un numero positivo', async () => {
    const { onSubmit } = renderForm();

    fill('Netflix', '-5');
    fireEvent.press(screen.getByTestId('budget-line-submit'));

    expect(await screen.findByText('Introduce un importe válido mayor que 0')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('un reembolso se puede elegir como tipo de linea', async () => {
    const { onSubmit } = renderForm();

    fill('Luz Ivan', '50');
    fireEvent.press(screen.getByLabelText('Reembolso'));
    fireEvent.press(screen.getByTestId('budget-line-submit'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ lineType: 'REFUND', amount: '50' });
  });

  it('ya no ofrece el tipo limite ni pide categoria', () => {
    renderForm();

    expect(screen.queryByLabelText('Límite')).toBeNull();
    expect(screen.queryByLabelText('Categoría')).toBeNull();
  });

  it('no muestra los selectores que no aplican', () => {
    renderForm({ scopeOptions: null });

    expect(screen.queryByText('Se aplica a')).toBeNull();
  });

  it('muestra el error del servidor si guardar falla', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new ApiError(400, 'El grupo ya no existe'));
    renderForm({ onSubmit });

    fill('Netflix', '21,99');
    fireEvent.press(screen.getByTestId('budget-line-submit'));

    expect(await screen.findByText('El grupo ya no existe')).toBeTruthy();
  });

  it('cancela sin enviar', () => {
    const { onSubmit, onCancel } = renderForm();

    fireEvent.press(screen.getByTestId('budget-line-cancel'));

    expect(onCancel).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(confirmAsync).not.toHaveBeenCalled();
  });

  describe('cancelar con cambios sin guardar', () => {
    it('pide confirmacion y descarta si se acepta', async () => {
      const { onCancel } = renderForm();

      fireEvent.changeText(screen.getByTestId('budget-line-name'), 'Netflix');
      fireEvent.press(screen.getByTestId('budget-line-cancel'));

      await waitFor(() => expect(onCancel).toHaveBeenCalled());
      expect(confirmAsync).toHaveBeenCalledWith(expect.objectContaining({ title: 'Descartar cambios' }));
    });

    it('no cierra si se decide seguir editando', async () => {
      jest.mocked(confirmAsync).mockResolvedValueOnce(false);
      const { onCancel } = renderForm();

      fireEvent.changeText(screen.getByTestId('budget-line-name'), 'Netflix');
      fireEvent.press(screen.getByTestId('budget-line-cancel'));

      await waitFor(() => expect(confirmAsync).toHaveBeenCalled());
      expect(onCancel).not.toHaveBeenCalled();
      expect(screen.getByDisplayValue('Netflix')).toBeTruthy();
    });
  });

  it('bloquea cancelar y eliminar mientras se esta guardando', async () => {
    const onSubmit = jest.fn(() => new Promise(() => {}));
    const onDelete = jest.fn();
    const { onCancel } = renderForm({ onSubmit, onDelete });

    fill('Netflix', '21,99');
    fireEvent.press(screen.getByTestId('budget-line-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());

    fireEvent.press(screen.getByTestId('budget-line-cancel'));
    fireEvent.press(screen.getByTestId('budget-line-delete'));
    fireEvent.press(screen.getByTestId('budget-line-submit'));

    expect(onCancel).not.toHaveBeenCalled();
    expect(confirmAsync).not.toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('un segundo toque en eliminar no lanza otro borrado mientras el primero sigue en curso', async () => {
    const onDelete = jest.fn(() => new Promise(() => {}));
    renderForm({ defaultValues: { ...emptyValues, name: 'Netflix', amount: '21,99' }, onDelete });

    fireEvent.press(screen.getByTestId('budget-line-delete'));
    await waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
    fireEvent.press(screen.getByTestId('budget-line-delete'));

    expect(confirmAsync).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('nombra cada grupo de opciones para el lector de pantalla', () => {
    renderForm();

    expect(screen.getByLabelText('Tipo de línea').props.accessibilityRole).toBe('radiogroup');
    expect(screen.getByLabelText('Se aplica a').props.accessibilityRole).toBe('radiogroup');
  });

  describe('eliminar', () => {
    it('no aparece si no se pasa onDelete', () => {
      renderForm();
      expect(screen.queryByTestId('budget-line-delete')).toBeNull();
    });

    it('pide confirmacion y borra con el alcance elegido', async () => {
      const onDelete = jest.fn().mockResolvedValue(undefined);
      renderForm({ defaultValues: { ...emptyValues, name: 'Netflix', amount: '21,99', scope: 'month' }, onDelete });

      fireEvent.press(screen.getByLabelText('Todos los meses'));
      fireEvent.press(screen.getByTestId('budget-line-delete'));

      await waitFor(() => expect(onDelete).toHaveBeenCalledWith('template'));
      expect(confirmAsync).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('de este mes y de los siguientes') }),
      );
    });

    it('no borra si se cancela la confirmacion', async () => {
      jest.mocked(confirmAsync).mockResolvedValueOnce(false);
      const onDelete = jest.fn();
      renderForm({ defaultValues: { ...emptyValues, name: 'Netflix', amount: '21,99' }, onDelete });

      fireEvent.press(screen.getByTestId('budget-line-delete'));

      await waitFor(() => expect(confirmAsync).toHaveBeenCalled());
      expect(onDelete).not.toHaveBeenCalled();
    });

    it('muestra el error del servidor si borrar falla', async () => {
      const onDelete = jest.fn().mockRejectedValue(new ApiError(404, 'Línea no encontrada'));
      renderForm({ defaultValues: { ...emptyValues, name: 'Netflix', amount: '21,99' }, onDelete });

      fireEvent.press(screen.getByTestId('budget-line-delete'));

      expect(await screen.findByText('Línea no encontrada')).toBeTruthy();
    });
  });
});
